"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabaseClient";

export default function AdminPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    verifierAdminEtChargerUtilisateurs();
  }, []);

  const verifierAdminEtChargerUtilisateurs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    // On vérifie si l'utilisateur actuel a le statut is_admin = true
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!currentUserProfile || !currentUserProfile.is_admin) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // S'il est admin, on charge la liste de tous les utilisateurs
    fetchProfiles();
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && !error) {
      setProfiles(data);
    }
    setLoading(false);
  };

const toggleApproval = async (id: string, currentStatus: boolean) => {
  const { error } = await supabase
    .from("profiles")
    .update({ is_approved: !currentStatus })
    .eq("id", id);

  if (!error) {
    // Mise à jour locale en temps réel
    setProfiles(profiles.map(p => p.id === id ? { ...p, is_approved: !currentStatus } : p));
  } else {
    console.error("Erreur de mise à jour Supabase :", error);
    alert(`Erreur : ${error.message}`);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <span className="text-emerald-900 font-bold tracking-widest uppercase">Chargement de l'interface...</span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-4 text-center">
        <h1 className="text-4xl font-black text-red-800 mb-4 uppercase tracking-wide">Accès Refusé</h1>
        <p className="text-red-900/70 font-semibold mb-8">
          Vous n'avez pas les droits administrateur requis pour visualiser cette page.
        </p>
        <button 
          onClick={() => router.push("/")} 
          className="bg-red-800 text-white px-8 py-3 rounded-full font-bold hover:bg-red-900 transition-colors shadow-lg"
        >
          Retour à l'application
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl border-4 border-emerald-900/10 overflow-hidden">
        
        {/* EN-TÊTE ADMIN */}
        <div className="bg-emerald-950 p-8 flex justify-between items-center border-b-8 border-amber-500">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain bg-white/10 rounded-xl p-1" />
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">Administration</h1>
              <p className="text-emerald-300/70 text-sm font-semibold mt-1">Gestion des accès utilisateurs</p>
            </div>
          </div>
          <button 
            onClick={() => router.push("/")} 
            className="text-emerald-100 hover:text-white bg-emerald-800/50 hover:bg-emerald-800 px-6 py-2 rounded-lg font-bold transition-colors border border-emerald-700"
          >
            Retour au Générateur
          </button>
        </div>

        {/* TABLEAU DES UTILISATEURS */}
        <div className="p-8 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50 text-emerald-950 border-b-2 border-emerald-200">
                <th className="p-4 font-black uppercase text-xs tracking-wider">Email Utilisateur</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider">Date d'inscription</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider">Rôle</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider">Statut d'accès</th>
                <th className="p-4 font-black uppercase text-xs tracking-wider text-center">Action de validation</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(profile => (
                <tr key={profile.id} className="border-b border-gray-100 hover:bg-emerald-50/50 transition-colors">
                  <td className="p-4 text-emerald-950 font-bold">{profile.email}</td>
                  <td className="p-4 text-gray-500 text-sm font-semibold">
                    {new Date(profile.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4">
                    {profile.is_admin ? (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-3 py-1 rounded-full font-black uppercase">
                        Admin
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 border border-gray-200 text-xs px-3 py-1 rounded-full font-bold uppercase">
                        Professeur
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {profile.is_approved ? (
                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-3 py-1 rounded-full font-black uppercase">
                        Approuvé
                      </span>
                    ) : (
                      <span className="bg-red-100 text-red-800 border border-red-300 text-xs px-3 py-1 rounded-full font-black uppercase">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {/* On empêche un admin de se révoquer lui-même pour éviter de se bloquer l'accès */}
                    {!profile.is_admin ? (
                      <button
                        onClick={() => toggleApproval(profile.id, profile.is_approved)}
                        className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-wide text-white transition-all shadow-md active:scale-95 ${
                          profile.is_approved 
                          ? "bg-red-600 hover:bg-red-700 border-b-4 border-red-800" 
                          : "bg-emerald-600 hover:bg-emerald-700 border-b-4 border-emerald-800"
                        }`}
                      >
                        {profile.is_approved ? "Révoquer l'accès" : "Autoriser l'accès"}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs font-bold italic">Intouchable</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 font-semibold italic">
                    Aucun utilisateur trouvé dans la base de données.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}