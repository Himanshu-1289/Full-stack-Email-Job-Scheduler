import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { issueSessionToken } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(env.googleClientId);

/**
 * Frontend uses Google Identity Services (One Tap / button) to get an
 * ID token client-side, then POSTs it here. We verify it server-side,
 * upsert the user, and set our own httpOnly session cookie.
 */
router.post("/google", async (req, res) => {
  const { idToken } = req.body as { idToken?: string };
  if (!idToken) return res.status(400).json({ error: "idToken required" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        name: payload.name || payload.email,
        avatarUrl: payload.picture,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        avatarUrl: payload.picture,
      },
    });

    const token = issueSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    res
      .cookie("session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Google verification failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("session").json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  res.json({ ok: true });
});

export default router;
