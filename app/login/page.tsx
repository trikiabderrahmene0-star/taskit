"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setErrorMessage(null);

  try {
    if (isSignUp) {
      // Logic d'inscription
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      if (error) throw error;
      alert("Inscription réussie ! Votre compte est en attente de validation.");
      setIsSignUp(false);
    } else {
      // ⚡ ASTUCE PERFORMANCE : On vide le cache de session locale avant de se connecter
      // Cela évite que Supabase attende l'expiration de l'ancienne session
      await supabase.auth.signOut();

      // Connexion directe
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Lecture rapide du profil
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, is_approved")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          router.push("/admin");
        } else if (profile?.is_approved) {
          router.push("/");
        } else {
          await supabase.auth.signOut();
          setErrorMessage("Votre compte est en attente de validation par un administrateur.");
        }
      }
    }
  } catch (error: any) {
    setErrorMessage(error.message);
  } finally {
    setLoading(false);
  }
};
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-cover bg-center"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1453738773917-9c307973c177?auto=format&fit=crop&w=1920&q=80')" 
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px]"></div>

      <div className="w-full max-w-md bg-amber-50/95 backdrop-blur-xl rounded-[3rem] shadow-[0_20px_50px_rgba(4,47,46,0.5)] border-4 border-emerald-800/20 p-10 relative z-10 transform transition-all duration-500 hover:-translate-y-1">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-24 w-auto mb-6 drop-shadow-md transition-transform duration-500 hover:scale-105"
          />
          <h1 className="text-3xl font-black text-emerald-950 uppercase tracking-wider">
            {isSignUp ? "Inscription" : "Connexion"}
          </h1>
          <p className="text-emerald-800/70 font-semibold text-sm mt-2">
            Générateur d'Évaluations
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-100 border-2 border-red-200 text-red-600 p-4 rounded-[2rem] text-sm mb-6 text-center font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {isSignUp && (
            <div className="group relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-full outline-none focus:border-emerald-600 focus:bg-amber-50 focus:ring-4 focus:ring-emerald-600/10 text-emerald-950 font-semibold placeholder-amber-900/40 transition-all duration-300 shadow-inner"
              />
            </div>
          )}

          <div className="group relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Adresse Email"
              className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-full outline-none focus:border-emerald-600 focus:bg-amber-50 focus:ring-4 focus:ring-emerald-600/10 text-emerald-950 font-semibold placeholder-amber-900/40 transition-all duration-300 shadow-inner"
            />
          </div>

          <div className="group relative">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full px-6 py-4 bg-white border-2 border-amber-200 rounded-full outline-none focus:border-emerald-600 focus:bg-amber-50 focus:ring-4 focus:ring-emerald-600/10 text-emerald-950 font-semibold placeholder-amber-900/40 transition-all duration-300 shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-800 text-white font-black uppercase tracking-wide py-4 rounded-full shadow-lg hover:bg-emerald-900 hover:shadow-emerald-900/30 active:scale-95 transition-all duration-300 mt-2 border-b-4 border-emerald-950"
          >
            {loading ? "Chargement..." : isSignUp ? "Créer mon compte" : "Accéder à l'espace"}
          </button>
        </form>

        <div className="mt-8 text-center border-t-2 border-amber-200/50 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage(null);
            }}
            className="text-sm font-bold text-emerald-800 hover:text-emerald-950 transition-colors duration-300 cursor-pointer"
          >
            {isSignUp
              ? "Déjà enseignant ? Se connecter"
              : "Nouveau professeur ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
