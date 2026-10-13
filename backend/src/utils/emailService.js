const nodemailer = require("nodemailer");
const User = require("../models/user.model");

/**
 * Send email notification to user/watcher
 */
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        if (!to) return;

        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Project Management System" <notifications@pm.local>',
                to,
                subject,
                text,
                html: html || text.replace(/\n/g, "<br>")
            });

            console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
        } else {
            console.log(`\n================= [SIMULATED WATCHER EMAIL NOTIFICATION] =================`);
            console.log(`TO: ${to}`);
            console.log(`SUBJECT: ${subject}`);
            console.log(`BODY:\n${text}`);
            console.log(`=========================================================================\n`);
        }
    } catch (err) {
        console.error("[EMAIL SERVICE WARNING]: Could not dispatch email:", err.message);
    }
};

/**
 * Helper to dispatch formatted emails for important events
 */
const sendWatcherEmail = async (userId, type, subject, message) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.email) return;

        const emailText = `Hello ${user.name},\n\n${message}\n\nProject: Project Management System\n\nLogin to the system to view the latest project updates.`;

        await sendEmail({
            to: user.email,
            subject: `${type.replace(/_/g, " ")} — ${subject}`,
            text: emailText
        });
    } catch (err) {
        console.error("sendWatcherEmail error:", err);
    }
};

module.exports = {
    sendEmail,
    sendWatcherEmail
};
