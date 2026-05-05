const nodemailer = require('nodemailer');

let transporter = null;

const initTransporter = () => {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) {
      console.warn('[邮件] SMTP 未配置，跳过邮件发送');
      return null;
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.163.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return transporter;
};

async function sendVerificationCode(toEmail, code) {
  const t = initTransporter();
  if (!t) {
    throw new Error('邮件服务未配置');
  }

  await t.sendMail({
    from: `"NomadFlow" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'NomadFlow 邮箱验证码',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:24px;font-family:Arial,sans-serif">
        <h2 style="color:#6F8B73">NomadFlow 游牧地图</h2>
        <p>你的验证码是：</p>
        <div style="font-size:32px;font-weight:bold;color:#6F8B73;letter-spacing:6px;padding:16px;background:#f0f7f2;text-align:center;border-radius:8px">
          ${code}
        </div>
        <p style="color:#999;margin-top:16px">5分钟内有效，请勿转发给他人。</p>
      </div>
    `,
  });
}

module.exports = { sendVerificationCode };
