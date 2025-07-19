const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const YOUR_DOMAIN = "http://localhost:3000"; // Change this to your frontend URL when deploying

app.post("/create-checkout-session", async (req, res) => {
  const { name, email, phone, date, time, packageType } = req.body;

  const packagePrices = {
    basic: 15000,
    premium: 30000,
    deluxe: 50000,
  };

  const amount = packagePrices[packageType.toLowerCase()];
  if (!amount) return res.status(400).json({ error: "Invalid package type" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${packageType} Package`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${YOUR_DOMAIN}/success.html`,
      cancel_url: `${YOUR_DOMAIN}/cancel.html`,
      metadata: { name, email, phone, date, time, packageType },
    });

    // Send confirmation email to admin
    sendEmailToAdmin({ name, email, phone, date, time, packageType });

    res.json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

function sendEmailToAdmin({ name, email, phone, date, time, packageType }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.TO_EMAIL,
    subject: `New Booking: ${packageType} Package`,
    text: `
New Booking Details:
Name: ${name}
Email: ${email}
Phone: ${phone}
Date: ${date}
Time: ${time}
Package: ${packageType}
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("Error sending email:", error);
    else console.log("Email sent:", info.response);
  });
}

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
