import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// Create transporter once
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter when server starts
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error);
  } else {
    console.log("✅ Gmail SMTP Connected");
  }
});

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      phone,
      studentClass,
      message,
    } = body;

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill all required fields.",
        },
        { status: 400 }
      );
    }

    // -------------------------
    // Email to Admin
    // -------------------------

    const adminMail = {
      from: `"Global Vista Educators" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `📩 New Student Inquiry | ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:30px;background:#f5f5f5;">
          <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:10px;padding:30px;">

            <h2 style="color:#0A2A66;">
              📩 New Student Inquiry
            </h2>

            <table cellpadding="10" cellspacing="0" width="100%" style="border-collapse:collapse;">
              <tr>
                <td><strong>Name</strong></td>
                <td>${name}</td>
              </tr>

              <tr>
                <td><strong>Email</strong></td>
                <td>${email}</td>
              </tr>

              <tr>
                <td><strong>Phone</strong></td>
                <td>${phone || "N/A"}</td>
              </tr>

              <tr>
                <td><strong>Student Class</strong></td>
                <td>${studentClass || "N/A"}</td>
              </tr>

              <tr>
                <td><strong>Message</strong></td>
                <td>${message}</td>
              </tr>
            </table>

            <hr style="margin:30px 0">

            <p>
              This enquiry was submitted from the
              <strong>Global Vista Educators</strong> website.
            </p>

          </div>
        </div>
      `,
    };

    // -------------------------
    // Auto Reply
    // -------------------------

    const autoReplyMail = {
      from: `"Global Vista Educators" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Thank you for contacting Global Vista Educators",
      html: `
        <div style="font-family:Arial,sans-serif;padding:30px;background:#f5f5f5;">

          <div style="max-width:650px;margin:auto;background:#ffffff;border-radius:10px;padding:30px;">

            <h2 style="color:#0A2A66;">
              Hello ${name},
            </h2>

            <p>
              Thank you for contacting
              <strong>Global Vista Educators.</strong>
            </p>

            <p>
              We have successfully received your enquiry.
            </p>

            <p>
              One of our academic advisors will contact you
              within <strong>24 hours.</strong>
            </p>

            <br>

            <p>
              Regards,
            </p>

            <strong>
              Global Vista Educators
            </strong>

            <hr style="margin:30px 0">

            <small style="color:#666;">
              Please do not reply to this email.
            </small>

          </div>

        </div>
      `,
    };

    // Send both emails simultaneously
   // Send admin email first
await transporter.sendMail(adminMail);

// Send response immediately
const response = NextResponse.json({
  success: true,
  message: "Message sent successfully.",
});

// Send auto reply in background
transporter
  .sendMail(autoReplyMail)
  .then(() => {
    console.log("✅ Auto reply sent.");
  })
  .catch((err) => {
    console.error("❌ Auto reply failed:", err);
  });

return response;

  } catch (error) {

    console.error("❌ Contact Form Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to send email.",
      },
      {
        status: 500,
      }
    );
  }
}