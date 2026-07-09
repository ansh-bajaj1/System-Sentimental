const nodemailer = require('nodemailer');
const axios = require('axios');
const Alert = require('../models/Alert');
const settingsService = require('./settingsService');
const { redisClient } = require('../config/redis');
const prometheus = require('./prometheus');
const logger = require('../utils/logger');

// Send email helper
const sendEmailAlert = async (settings, alertDetails) => {
  try {
    const transporter = nodemailer.createTransport({
      host: settings.emailSmtpHost,
      port: settings.emailSmtpPort,
      secure: settings.emailSmtpPort === 465, // true for 465, false for other ports
      auth: settings.emailSmtpUser && settings.emailSmtpPass ? {
        user: settings.emailSmtpUser,
        pass: settings.emailSmtpPass
      } : undefined
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background-color: ${alertDetails.severity === 'CRITICAL' ? '#d9534f' : alertDetails.severity === 'HIGH' ? '#f0ad4e' : '#5bc0de'}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 24px;">System Sentinel Alert</h2>
          <p style="margin: 5px 0 0 0; font-weight: bold; text-transform: uppercase;">Severity: ${alertDetails.severity}</p>
        </div>
        <div style="padding: 24px; color: #333; background-color: #fcfcfc;">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px; border-bottom: 1px solid #eee;">Host:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alertDetails.host}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Service:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alertDetails.service}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Timestamp:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${alertDetails.timestamp.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #eee;">Issue:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; color: #d9534f; font-weight: 500;">${alertDetails.issue}</td>
            </tr>
          </table>
          <div style="background-color: #f0f8ff; border-left: 4px solid #337ab7; padding: 15px; border-radius: 4px; margin-top: 15px;">
            <strong style="color: #337ab7;">SRE Recommendation:</strong>
            <p style="margin: 5px 0 0 0; line-height: 1.5;">${alertDetails.recommendation}</p>
          </div>
        </div>
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #e0e0e0;">
          This is an automated message sent by System Sentinel Log Monitor & Alerting Engine.
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: settings.emailSmtpFrom,
      to: settings.emailSmtpUser || 'sre-team@sentinel.local',
      subject: `[System Sentinel - ${alertDetails.severity}] Alert on ${alertDetails.host} (${alertDetails.service})`,
      html: htmlContent
    });

    logger.info(`Email alert dispatched. Message ID: ${info.messageId}`);
  } catch (error) {
    logger.error(`Failed to dispatch email alert: ${error.message}`);
  }
};

// Send Slack helper
const sendSlackAlert = async (settings, alertDetails) => {
  try {
    const slackColor = alertDetails.severity === 'CRITICAL' ? '#ff0000' : alertDetails.severity === 'HIGH' ? '#ff9900' : '#00c0ff';
    const payload = {
      attachments: [
        {
          color: slackColor,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `🚨 System Sentinel Alert: ${alertDetails.severity}`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Host:*\n\`${alertDetails.host}\``
                },
                {
                  type: 'mrkdwn',
                  text: `*Service:*\n\`${alertDetails.service}\``
                }
              ]
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Issue:*\n${alertDetails.issue}`
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Recommendation:*\n_${alertDetails.recommendation}_`
              }
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'plain_text',
                  text: `Timestamp: ${alertDetails.timestamp.toISOString()}`
                }
              ]
            }
          ]
        }
      ]
    };

    await axios.post(settings.slackWebhook, payload);
    logger.info('Slack webhook alert dispatched successfully');
  } catch (error) {
    logger.error(`Failed to dispatch Slack alert: ${error.message}`);
  }
};

// Main trigger function
const triggerAlert = async (alertData) => {
  try {
    const settings = settingsService.getSettings();
    const { severity, service, issue, recommendation, host = osHostname() } = alertData;

    // Create unique cooldown key based on service, severity, and first 30 chars of the issue to prevent spam
    const cleanedIssue = issue.replace(/\d+/g, '').substring(0, 30).trim(); // strip numbers for group throttling (e.g. "CPU at 85%" vs "CPU at 90%")
    const cooldownKey = `cooldown:${service}:${severity}:${cleanedIssue}`;

    // Increment Prometheus counter
    prometheus.metrics.alertsCounter.inc({ severity, service, issue: cleanedIssue });

    // Save to Database regardless of cooldown so we keep audit history
    const alert = new Alert({
      severity,
      service,
      issue,
      recommendation,
      host,
      timestamp: new Date(),
      acknowledged: false
    });
    await alert.save();

    // Broadcast live over Socket.io
    if (global.io) {
      global.io.emit('new-alert', alert);
    }

    // Check Redis for active cooldown
    let cooldownActive = false;
    try {
      if (redisClient.isOpen) {
        const cooldownVal = await redisClient.get(cooldownKey);
        if (cooldownVal) {
          cooldownActive = true;
          logger.debug(`Alert for ${service} (${severity}) suppressed due to active cooldown.`);
        } else {
          // Set cooldown key in Redis
          const cooldownSeconds = settings.alertCooldown || 300;
          await redisClient.set(cooldownKey, 'active', {
            EX: cooldownSeconds
          });
        }
      }
    } catch (redisErr) {
      logger.error(`Redis cooldown check failed: ${redisErr.message}`);
    }

    // Send notifications if not suppressed
    if (!cooldownActive) {
      logger.warn(`ANOMALY DETECTED [${severity}]: ${issue} on ${host} (${service})`);
      
      if (settings.emailEnabled && settings.emailSmtpHost) {
        await sendEmailAlert(settings, alert);
      }
      if (settings.slackEnabled && settings.slackWebhook) {
        await sendSlackAlert(settings, alert);
      }
    }

    return alert;
  } catch (error) {
    logger.error(`Error in triggerAlert engine: ${error.message}`);
  }
};

const osHostname = () => {
  try {
    const os = require('os');
    return os.hostname();
  } catch {
    return 'localhost';
  }
};

module.exports = {
  triggerAlert
};
