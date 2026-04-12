"use client";

// Signup now redirects to login — Google OAuth handles everything in one flow
import { redirect } from "next/navigation";

export default function Signup() {
  redirect("/login");
}
