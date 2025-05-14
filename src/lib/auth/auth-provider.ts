"use client"; // Bu dosya istemci bileşenleri tarafından kullanılacak

// Doğrudan next-auth/react'ten alıp export ediyoruz.
// Bu dosyanın sunucu tarafı bağımlılığı YOKTUR.
export { signIn, signOut } from "next-auth/react"; 