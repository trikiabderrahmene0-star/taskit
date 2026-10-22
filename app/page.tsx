"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import rehypeRaw from "rehype-raw";
import { supabase } from "./supabaseClient";

const TYPES_TITRE = ["Devoir maison", "Évaluation de synthèse", "Évaluation périodique", "Examen blanc", "Interrogation écrite", "Autres..."];
const MATIERES = ["Mathématiques", "Français", "Anglais", "Physique-Chimie", "SVT", "Histoire-Géographie", "Espagnol", "Philosophie", "Informatique"];

const POLICES = [
  "Arial", "Calibri", "Cambria", "Times New Roman", "Verdana", "Georgia", 
  "Tahoma", "Trebuchet MS", "Century Gothic", "Garamond", "Book Antiqua", 
  "Palatino Linotype", "Arial Narrow", "Impact", "Comic Sans MS", "Courier New",
  "Lucida Sans Unicode", "Helvetica", "Consolas", "Franklin Gothic Medium"
];

// NOUVEAU : Liste des 15 langues
const LANGUES = [
  "Français", "Anglais", "Arabe", "Espagnol", "Allemand", 
  "Italien", "Portugais", "Néerlandais", "Russe", "Chinois", 
  "Japonais", "Coréen", "Turc", "Grec", "Polonais"
];

const creerNouvelOnglet = (id: number) => ({
  id,
  typeTitre: "Devoir maison",
  titreSurMesure: "",
  candidat: "",
  cours: "",
  baremeGlobal: 20,
  modeMatiere: "unique",
  matiereGlobale: "Mathématiques",
  langue: "Français", // NOUVEAU : Langue par défaut
  police: "Arial",
  taillePolice: 12,
  tailleTitres: 22,
  interligne: 1.5,
  pagesApprox: 2,
  exercices: [
    { id: 1, titre: "Exercice 1", description: "", points: 5, matiere: "Mathématiques" }
  ],
  exerciceActifId: 1,
  resultatSujet: null as string | null,
  resultatCorrige: null as string | null,
  idHist: null as number | null
});

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [onglets, setOnglets] = useState([creerNouvelOnglet(1)]);
  const [ongletActifId, setOngletActifId] = useState(1);
  const [compteurOnglets, setCompteurOnglets] = useState(2);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [vueActive, setVueActive] = useState<"sujet" | "corrige">("sujet");
  const [isGeneratingCorrige, setIsGeneratingCorrige] = useState(false);

  const [showCoursModal, setShowCoursModal] = useState(false);
  const [showHistoriqueModal, setShowHistoriqueModal] = useState(false);
  const [historique, setHistorique] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    verifierSessionEtChargerBDD();
  }, []);

 const verifierSessionEtChargerBDD = async () => {
    // 1. Vérifier si on est connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      window.location.href = "/login";
      return;
    }

    // 2. NOUVEAU : Vérifier si le compte est approuvé par l'admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", session.user.id)
      .single();

    if (!profile || !profile.is_approved) {
      // Si non approuvé, on le déconnecte et on le renvoie vers une page d'attente
      await supabase.auth.signOut();
      alert("Votre compte est en attente de validation par un administrateur.");
      window.location.href = "/attente-validation"; // Ou "/login"
      return;
    }

    // 3. Si approuvé, on charge ses données (Ton code existant)
    const { data, error } = await supabase
      .from("historique")
      .select("devoir_data")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && !error) {
      setHistorique(data.map((ligne: any) => ligne.devoir_data));
    }
  };


  const sauvegarderOuMettreAJourBDD = async (devoirData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await supabase.from("historique").insert([
        {
          devoir_data: devoirData,
          user_id: session.user.id,
        },
      ]);
      // Mise à jour de l'historique local
      setHistorique(prev => [devoirData, ...prev.filter(h => h.idHist !== devoirData.idHist)].slice(0, 20));
    } catch (e) {
      console.error("Erreur de sauvegarde Supabase :", e);
    }
  };

  const chargerDepuisHistorique = (devoirHist: any) => {
    const nouvelOnglet = { ...devoirHist, id: compteurOnglets };
    setOnglets([...onglets, nouvelOnglet]);
    setOngletActifId(compteurOnglets);
    setCompteurOnglets(compteurOnglets + 1);
    setShowHistoriqueModal(false);
  };

  if (!isMounted) return null;

  const ongletActif = onglets.find(o => o.id === ongletActifId) || onglets[0];

  const modifierOngletActif = (modifications: any) => {
    const nouveauxOnglets = onglets.map(onglet => {
      if (onglet.id === ongletActifId) {
        return { ...onglet, ...modifications };
      }
      return onglet;
    });
    setOnglets(nouveauxOnglets);
  };

  const modifierExerciceActif = (modifications: any) => {
    const nouveauxOnglets = onglets.map(onglet => {
      if (onglet.id === ongletActifId) {
        const nouveauxExercices = onglet.exercices.map(ex => {
          if (ex.id === onglet.exerciceActifId) {
            return { ...ex, ...modifications };
          }
          return ex;
        });
        return { ...onglet, exercices: nouveauxExercices };
      }
      return onglet;
    });
    setOnglets(nouveauxOnglets);
  };

  const supprimerExercice = (e: React.MouseEvent, idToRemove: number) => {
    e.stopPropagation(); // Évite de sélectionner l'exercice quand on clique sur supprimer
    const nouveauxOnglets = onglets.map(onglet => {
      if (onglet.id === ongletActifId) {
        const nouveauxExercices = onglet.exercices.filter(ex => ex.id !== idToRemove);
        // Si on supprime l'exercice actif, on bascule sur un autre
        const nouvelActif = onglet.exerciceActifId === idToRemove
          ? (nouveauxExercices.length > 0 ? nouveauxExercices[0].id : 0)
          : onglet.exerciceActifId;
        return { ...onglet, exercices: nouveauxExercices, exerciceActifId: nouvelActif };
      }
      return onglet;
    });
    setOnglets(nouveauxOnglets);
  };

  const deplacerExercice = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const nouveauxOnglets = onglets.map(onglet => {
      if (onglet.id === ongletActifId) {
        const nouveauxExos = [...onglet.exercices];
        if (direction === 'up' && index > 0) {
          [nouveauxExos[index - 1], nouveauxExos[index]] = [nouveauxExos[index], nouveauxExos[index - 1]];
        } else if (direction === 'down' && index < nouveauxExos.length - 1) {
          [nouveauxExos[index + 1], nouveauxExos[index]] = [nouveauxExos[index], nouveauxExos[index + 1]];
        }
        return { ...onglet, exercices: nouveauxExos };
      }
      return onglet;
    });
    setOnglets(nouveauxOnglets);
  };
  
  const ajouterExercice = () => {
    const nouveauxOnglets = onglets.map(onglet => {
      if (onglet.id === ongletActifId) {
        const nouvelId = onglet.exercices.length > 0 ? Math.max(...onglet.exercices.map(e => e.id)) + 1 : 1;
        const nouvelExo = { 
          id: nouvelId, 
          titre: `Exercice ${nouvelId}`, 
          description: "", 
          points: 0, 
          matiere: onglet.modeMatiere === "unique" ? onglet.matiereGlobale : MATIERES[0] 
        };
        return { 
          ...onglet, 
          exercices: [...onglet.exercices, nouvelExo],
          exerciceActifId: nouvelId
        };
      }
      return onglet;
    });
    setOnglets(nouveauxOnglets);
  };

  const ajouterOnglet = () => {
    const nouvelOnglet = creerNouvelOnglet(compteurOnglets);
    setOnglets([...onglets, nouvelOnglet]);
    setOngletActifId(compteurOnglets);
    setCompteurOnglets(compteurOnglets + 1);
  };

  const fermerOnglet = (e: React.MouseEvent, idToRemove: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (onglets.length <= 1) return;
    
    const nouveauxOnglets = onglets.filter(o => o.id !== idToRemove);
    setOnglets(nouveauxOnglets);
    
    if (ongletActifId === idToRemove) {
      setOngletActifId(nouveauxOnglets[nouveauxOnglets.length - 1].id);
    }
  };

  const getTitreAffichage = (onglet: any) => {
    if (onglet.typeTitre === "Autres...") return onglet.titreSurMesure || "Nouveau devoir";
    return onglet.typeTitre;
  };

  const genererDevoir = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: getTitreAffichage(ongletActif),
          candidat: ongletActif.candidat,
          baremeGlobal: ongletActif.baremeGlobal,
          matiereGlobale: ongletActif.matiereGlobale,
          langue: ongletActif.langue, // NOUVEAU : On transmet la langue
          exercices: ongletActif.exercices,
          pagesApprox: ongletActif.pagesApprox,
          cours: ongletActif.cours,
          mode: "sujet"
        }),
      });

      const data = await response.json();
      if (data.result) {
        const idHistUnique = Date.now();
        const devoirComplet = {
          ...ongletActif,
          resultatSujet: data.result,
          idHist: idHistUnique,
          date: new Date().toLocaleString()
        };

        modifierOngletActif({ resultatSujet: data.result, idHist: idHistUnique });
        
        // SAUVEGARDE EN BDD AVEC LE TEXTE GÉNÉRÉ
        await sauvegarderOuMettreAJourBDD(devoirComplet);

        setVueActive("sujet");
        setShowModal(true);
      } else {
        alert("Erreur lors de la génération. Le modèle de l'IA est peut-être temporairement indisponible.");
      }
    } catch (error) {
      alert("Impossible de contacter le backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  const genererCorrige = async () => {
    setIsGeneratingCorrige(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: getTitreAffichage(ongletActif),
          baremeGlobal: ongletActif.baremeGlobal,
          langue: ongletActif.langue, // NOUVEAU : On transmet la langue
          exercices: ongletActif.exercices,
          cours: ongletActif.cours,
          mode: "corrige"
        }),
      });

      const data = await response.json();
      if (data.result) {
        const devoirMiseAJour = { ...ongletActif, resultatCorrige: data.result };
        modifierOngletActif({ resultatCorrige: data.result });
        
        // MISE À JOUR DANS LA BDD AVEC LE CORRIGÉ
        await sauvegarderOuMettreAJourBDD(devoirMiseAJour);

        setVueActive("corrige");
      } else {
        alert("Erreur lors de la génération du corrigé.");
      }
    } catch (error) {
      alert("Impossible de contacter le serveur.");
    } finally {
      setIsGeneratingCorrige(false);
    }
  };

  const exporterWord = () => {
    const sourceElement = document.getElementById("contenu-devoir-genere");
    if (!sourceElement) return;

    const cloneDiv = document.createElement("div");
    cloneDiv.innerHTML = sourceElement.innerHTML;

    const katexElements = cloneDiv.querySelectorAll('.katex');
    katexElements.forEach((el) => {
      const mathml = el.querySelector('.katex-mathml math');
      if (mathml) {
        el.replaceWith(mathml);
      }
    });

    const contenuHTML = cloneDiv.innerHTML;
    
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.microsoft.com/office/2004/12/omml' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Devoir</title>
      <style>
        @page WordSection1 { size: 21.0cm 29.7cm; margin: 1.27cm 1.27cm 1.27cm 1.27cm; }
        div.WordSection1 { page: WordSection1; }
        body { font-family: '${ongletActif.police}', sans-serif; font-size: ${ongletActif.taillePolice}pt; line-height: ${ongletActif.interligne}; color: black; }
        h1 { font-size: ${ongletActif.tailleTitres}pt; text-align: center; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; }
        h2 { font-size: ${ongletActif.tailleTitres - 4}pt; font-weight: bold; margin-top: 35px; margin-bottom: 15px; border-bottom: 2px solid black; padding-bottom: 5px; }
        p { margin-bottom: 15px; line-height: ${ongletActif.interligne}; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; margin-bottom: 20px; }
        th, td { border: 1px solid black; padding: 10px; text-align: center; vertical-align: middle; }
        th { background-color: #f0f0f0; font-weight: bold; }
        ul, ol { margin-bottom: 15px; padding-left: 30px; }
        li { margin-bottom: 8px; }
      </style>
    </head><body><div class="WordSection1">`;
    
    const footer = "</div></body></html>";
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(header + contenuHTML + footer);
    
    const element = document.createElement("a");
    element.href = source;
    element.download = `${getTitreAffichage(ongletActif).replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const exporterPDF = () => {
    const sourceElement = document.getElementById("contenu-devoir-genere");
    if (!sourceElement) return;

    const titreDocument = getTitreAffichage(ongletActif);
    const fenetreImpression = window.open("", "_blank", "width=800,height=1000");
    if (!fenetreImpression) return;

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${titreDocument}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: '${ongletActif.police}', sans-serif; font-size: ${ongletActif.taillePolice}pt; line-height: ${ongletActif.interligne}; color: #000000; background-color: #ffffff; margin: 0; padding: 0; }
            h1 { font-size: ${ongletActif.tailleTitres}pt; text-align: center; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 10px; }
            h2 { font-size: ${ongletActif.tailleTitres - 4}pt; font-weight: bold; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #000000; padding-bottom: 5px; color: #1e3a8a; }
            p { margin-bottom: 15px; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #000000; padding: 8px 12px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; text-align: center; }
            ul, ol { margin-bottom: 15px; padding-left: 25px; }
            li { margin-bottom: 6px; }
            strong { font-weight: bold; }
          </style>
        </head>
        <body>
          <div>${sourceElement.innerHTML}</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 300);
            };
          </script>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
  };
  
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-amber-50">
      <div className="flex-1 flex flex-col">
        
        {/* BARRE D'ONGLETS */}
        <div className="bg-emerald-950 flex items-end px-2 pt-2 space-x-1 overflow-x-auto select-none relative z-40">
          {onglets.map((onglet) => (
            <div 
              key={onglet.id}
              onClick={() => setOngletActifId(onglet.id)}
              className={`group relative flex items-center px-4 py-2 min-w-[180px] max-w-[240px] rounded-t-lg cursor-pointer transition-colors ${
                ongletActifId === onglet.id 
                ? "bg-emerald-800 text-white z-10 border-t-2 border-emerald-400" 
                : "bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/80 hover:text-emerald-100"
              }`}
            >
              <span className="truncate flex-1 text-sm font-semibold pr-4">
                {getTitreAffichage(onglet)}
              </span>
              {onglets.length > 1 && (
                <button 
                  onClick={(e) => fermerOnglet(e, onglet.id)}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-emerald-400 rounded-full w-5 h-5 flex items-center justify-center text-xs transition"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button 
            type="button"
            onClick={ajouterOnglet}
            className="w-8 h-8 mb-1 ml-1 flex items-center justify-center rounded-full bg-emerald-800 text-emerald-200 hover:bg-emerald-700 hover:text-white transition shadow-sm relative z-50 cursor-pointer"
          >
            +
          </button>
        </div>

        {/* HEADER */}
        <header className="bg-emerald-800 text-white border-b-8 border-amber-900 p-4 flex flex-col space-y-4 shadow-lg relative z-30">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4 w-full md:w-3/4 items-center">
              
              <img src="/logo.png" alt="Logo" className="h-10 w-auto mr-3 object-contain" />
              
              <div className="flex bg-emerald-700/50 rounded-lg p-1 border border-emerald-600">
                <select 
                  value={ongletActif.typeTitre}
                  onChange={(e) => modifierOngletActif({ typeTitre: e.target.value })}
                  className="bg-transparent text-white px-2 py-2 outline-none font-bold cursor-pointer appearance-none"
                >
                  {TYPES_TITRE.map(t => <option key={t} value={t} className="text-gray-900">{t}</option>)}
                </select>

                {ongletActif.typeTitre === "Autres..." && (
                  <div className="flex items-center ml-2 border-l border-emerald-500 pl-2">
                    <input 
                      type="text" 
                      value={ongletActif.titreSurMesure} 
                      onChange={(e) => modifierOngletActif({ titreSurMesure: e.target.value })}
                      className="bg-white text-emerald-900 font-bold rounded px-3 py-1 outline-none w-48 shadow-inner"
                      placeholder="Votre titre..."
                    />
                  </div>
                )}
              </div>

              <input 
                type="text" 
                placeholder="Élève ou Classe (Optionnel)"
                value={ongletActif.candidat}
                onChange={(e) => modifierOngletActif({ candidat: e.target.value })}
                className="bg-emerald-700/50 text-white placeholder-emerald-300 border border-emerald-600 rounded-lg px-3 py-2 w-1/4 outline-none focus:border-white transition ml-4"
              />
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowHistoriqueModal(true)} 
                className="bg-emerald-900 text-white px-3 py-2 rounded-lg font-bold hover:bg-emerald-950 border border-emerald-700 shadow flex items-center space-x-1 cursor-pointer text-sm"
              >
                <span>Historique BDD</span>
              </button>
              <button 
                onClick={() => setShowCoursModal(true)} 
                className="bg-amber-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-amber-600 shadow-md flex items-center space-x-1 cursor-pointer text-sm"
              >
                <span>Insérer mon Cours</span>
              </button>
              
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }} 
                className="bg-red-700 text-white px-3 py-2 rounded-lg font-bold hover:bg-red-800 shadow-md text-sm cursor-pointer"
              >
                Déconnexion
              </button>

              <div className="flex items-center space-x-2 bg-emerald-900 px-4 py-2 rounded-lg border border-emerald-700 whitespace-nowrap flex-nowrap shrink-0">
                <label className="font-semibold text-emerald-200 whitespace-nowrap">Sur :</label>
                <input 
                  type="number" 
                  value={ongletActif.baremeGlobal}
                  onChange={(e) => modifierOngletActif({ baremeGlobal: Number(e.target.value) })}
                  className="bg-transparent border-b-2 border-emerald-400 w-12 text-center font-bold text-xl outline-none text-white"
                />
                <span className="text-emerald-200 whitespace-nowrap">pts</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6 bg-emerald-900/30 p-2 rounded-lg border border-emerald-700/50">
            <label className="font-bold text-emerald-100 flex items-center">
              <span className="mr-2">Structure :</span>
              <select 
                value={ongletActif.modeMatiere}
                onChange={(e) => modifierOngletActif({ modeMatiere: e.target.value })}
                className="bg-white text-emerald-900 border border-emerald-600 rounded px-2 py-1 outline-none ml-2 cursor-pointer font-semibold"
              >
                <option value="unique">Un seul module (Une matière)</option>
                <option value="multiple">Multidisciplinaire (Matière par exercice)</option>
              </select>
            </label>

            {ongletActif.modeMatiere === "unique" && (
              <div className="flex items-center space-x-2 border-l border-emerald-700 pl-6">
                <label className="font-semibold text-emerald-200">Matière globale :</label>
                <select 
                  value={ongletActif.matiereGlobale}
                  onChange={(e) => modifierOngletActif({ matiereGlobale: e.target.value })}
                  className="bg-white text-emerald-900 font-bold rounded px-3 py-1 outline-none cursor-pointer"
                >
                  {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* NOUVEAU : Sélecteur de Langue */}
            <div className="flex items-center space-x-2 border-l border-emerald-700 pl-6">
              <label className="font-semibold text-emerald-200">Langue :</label>
              <select 
                value={ongletActif.langue}
                onChange={(e) => modifierOngletActif({ langue: e.target.value })}
                className="bg-white text-emerald-900 font-bold rounded px-3 py-1 outline-none cursor-pointer"
              >
                {LANGUES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative z-10">
          <aside className="w-72 bg-amber-100 border-r-2 border-amber-200 flex flex-col shadow-inner">
            <div className="p-4 border-b border-amber-200 relative z-20">
              <button 
                type="button"
                onClick={ajouterExercice}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold text-lg hover:bg-orange-600 shadow-md transform hover:-translate-y-0.5 border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all cursor-pointer relative z-50"
              >
                + Nouvel Exercice
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
              {ongletActif.exercices.map((exo, index) => (
              <div 
                key={exo.id} 
                onClick={() => modifierOngletActif({ exerciceActifId: exo.id })}
                className={`p-3 rounded-lg cursor-pointer border-2 transition-all group ${
                  ongletActif.exerciceActifId === exo.id 
                  ? 'bg-white border-blue-400 shadow-md transform scale-105 relative z-20' 
                  : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-700 truncate">{exo.titre}</span>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-full">
                      {exo.points} pts
                    </span>
                    
                    {/* Boutons de déplacement et suppression */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col">
                        <button onClick={(e) => deplacerExercice(e, index, 'up')} className="text-gray-400 hover:text-blue-600 text-[10px] leading-none">▲</button>
                        <button onClick={(e) => deplacerExercice(e, index, 'down')} className="text-gray-400 hover:text-blue-600 text-[10px] leading-none">▼</button>
                      </div>
                      <button 
                        onClick={(e) => supprimerExercice(e, exo.id)}
                        className="text-red-400 hover:text-white hover:bg-red-500 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                {ongletActif.modeMatiere === "multiple" && (
                  <div className="text-xs text-gray-500 font-semibold truncate">{exo.matiere}</div>
                )}
              </div>
            ))}
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-8 flex justify-center items-start bg-gray-100 relative z-0">
            <div className="w-full max-w-4xl bg-white shadow-xl rounded-sm min-h-[800px] relative overflow-hidden">
              <div className="absolute left-16 top-0 bottom-0 w-px bg-red-400 z-0"></div>
              <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(transparent 27px, #e5e7eb 28px)', backgroundSize: '100% 28px', marginTop: '4rem' }}></div>

              {ongletActif.exercices.map((exo) => exo.id === ongletActif.exerciceActifId && (
                <div key={exo.id} className="relative z-10 p-12 pl-24 space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="w-2/3 space-y-3">
                      <input 
                        type="text" 
                        value={exo.titre}
                        onChange={(e) => modifierExerciceActif({ titre: e.target.value })}
                        className="text-3xl font-extrabold text-indigo-900 border-none outline-none bg-transparent w-full placeholder-indigo-300"
                        placeholder="Titre de la partie..."
                      />
                      
                      {ongletActif.modeMatiere === "multiple" && (
                        <div className="flex items-center space-x-2 bg-indigo-50 p-2 rounded-lg border border-indigo-200 mt-2 w-max">
                          <span className="text-indigo-600 text-sm font-bold">Matière :</span>
                          <select 
                            value={exo.matiere || MATIERES[0]}
                            onChange={(e) => modifierExerciceActif({ matiere: e.target.value })}
                            className="bg-white border border-indigo-300 text-indigo-900 rounded px-2 py-1 font-semibold outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {MATIERES.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 bg-yellow-100 p-2 rounded-lg border-2 border-yellow-300 transform rotate-2">
                      <label className="text-yellow-800 font-bold text-sm uppercase">Points :</label>
                      <input 
                        type="number" 
                        value={exo.points}
                        onChange={(e) => modifierExerciceActif({ points: Number(e.target.value) })}
                        className="bg-white border border-yellow-400 rounded px-2 py-1 w-16 text-center font-bold text-lg outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Consignes pour l'IA</label>
                    <textarea 
                      value={exo.description}
                      onChange={(e) => modifierExerciceActif({ description: e.target.value })}
                      className="w-full h-80 bg-blue-50/50 border-2 border-blue-100 rounded-xl p-4 text-lg text-gray-700 leading-relaxed focus:ring-4 focus:ring-blue-200 outline-none resize-none shadow-inner"
                      placeholder="Décrivez l'exercice ici..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>

        <footer className="bg-white border-t-4 border-gray-200 p-4 flex flex-col lg:flex-row justify-between items-center shadow-lg relative z-50 gap-4">
          
          <div className="flex flex-wrap gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-200 w-full lg:w-auto">
            
            <div className="flex flex-col space-y-1">
              <label className="font-bold text-gray-600 text-xs uppercase">Police</label>
              <select value={ongletActif.police} onChange={(e) => modifierOngletActif({ police: e.target.value })} className="border border-gray-300 rounded px-2 py-1 outline-none bg-white cursor-pointer w-36">
                {POLICES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-gray-600 text-xs uppercase">Texte</label>
              <select value={ongletActif.taillePolice} onChange={(e) => modifierOngletActif({ taillePolice: Number(e.target.value) })} className="border border-gray-300 rounded px-2 py-1 outline-none bg-white cursor-pointer w-20">
                {[10, 11, 12, 13, 14, 16, 18].map(size => <option key={size} value={size}>{size} pt</option>)}
              </select>
            </div>

            <div className="flex flex-col space-y-1 border-l pl-4 border-gray-300">
              <label className="font-bold text-gray-600 text-xs uppercase">Titres</label>
              <select value={ongletActif.tailleTitres} onChange={(e) => modifierOngletActif({ tailleTitres: Number(e.target.value) })} className="border border-gray-300 rounded px-2 py-1 outline-none bg-white cursor-pointer w-20">
                {[16, 18, 20, 22, 24, 26, 28, 32].map(size => <option key={size} value={size}>{size} pt</option>)}
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="font-bold text-gray-600 text-xs uppercase">Interligne</label>
              <select value={ongletActif.interligne} onChange={(e) => modifierOngletActif({ interligne: Number(e.target.value) })} className="border border-gray-300 rounded px-2 py-1 outline-none bg-white cursor-pointer w-20">
                <option value={1.0}>Simple</option>
                <option value={1.15}>1.15</option>
                <option value={1.5}>1.5</option>
                <option value={1.8}>1.8</option>
                <option value={2.0}>Double</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1 border-l pl-4 border-gray-300">
              <label className="font-bold text-gray-600 text-xs uppercase">Pages estimées</label>
              <input 
                type="number" 
                min="1" max="10"
                value={ongletActif.pagesApprox} 
                onChange={(e) => modifierOngletActif({ pagesApprox: Number(e.target.value) })} 
                className="border border-gray-300 rounded px-2 py-1 outline-none bg-white w-16 text-center"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={genererDevoir}
              disabled={isGenerating}
              className={`flex-shrink-0 flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg py-4 px-10 rounded-2xl hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transform hover:-translate-y-1 transition-all relative z-50 cursor-pointer ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{isGenerating ? 'Génération...' : `Générer ${getTitreAffichage(ongletActif)}`}</span>
            </button>

            {/* BOUTON BOUTON POUR AFFICHER L'ANCIENNE GÉNÉRATION SI RESTAURÉE */}
            {ongletActif.resultatSujet && !isGenerating && (
               <button 
                 onClick={() => {
                   setVueActive("sujet");
                   setShowModal(true);
                 }}
                 className="bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-emerald-700 shadow-md cursor-pointer border-b-4 border-emerald-800"
               >
                 Consulter le sujet généré
               </button>
            )}
          </div>
        </footer>
      </div>

      {showCoursModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl flex flex-col shadow-2xl p-6">
            <h2 className="text-2xl font-bold mb-2 text-emerald-900">Matériel de cours (Optionnel)</h2>
            <p className="text-gray-600 mb-4 text-sm">Collez votre cours ici. L'IA se basera strictement sur ce texte pour formuler les questions et éviter tout hors-programme.</p>
            <textarea 
              value={ongletActif.cours || ""}
              onChange={(e) => modifierOngletActif({ cours: e.target.value })}
              className="w-full h-64 border-2 border-emerald-200 rounded-lg p-4 focus:outline-none focus:border-emerald-500 font-mono text-sm"
              placeholder="Ex: Théorème de Pythagore, définitions, formules à évaluer..."
            />
            <button onClick={() => setShowCoursModal(false)} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 self-end cursor-pointer">
              Enregistrer & Fermer
            </button>
          </div>
        </div>
      )}

      {showHistoriqueModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[70vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-emerald-900 p-4 text-white flex justify-between items-center">
              <h2 className="text-2xl font-bold">Historique des devoirs (Supabase)</h2>
              <button onClick={() => setShowHistoriqueModal(false)} className="text-white hover:text-red-400 text-3xl cursor-pointer">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {historique.length === 0 ? (
                <p className="text-gray-500 italic col-span-2 text-center py-12">Aucun devoir enregistré dans la base de données.</p>
              ) : (
                historique.map((hist, idx) => (
                  <div key={hist.idHist || idx} className="border-2 border-gray-200 p-4 rounded-lg hover:border-emerald-500 flex flex-col justify-between bg-white shadow-sm">
                    <div>
                      <h3 className="font-bold text-lg text-emerald-900">{getTitreAffichage(hist)}</h3>
                      <p className="text-xs text-gray-500 mt-1">{hist.date} • {hist.exercices?.length || 0} exo(s) • {hist.baremeGlobal} pts</p>
                      {hist.resultatSujet ? (
                        <span className="inline-block mt-2 bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded font-bold">
                          Sujet sauvegardé
                        </span>
                      ) : (
                        <span className="inline-block mt-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-semibold">
                          Brouillon (Non généré)
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => chargerDepuisHistorique(hist)}
                      className="mt-4 bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-lg hover:bg-emerald-200 transition text-sm cursor-pointer text-center"
                    >
                      Ouvrir dans un nouvel onglet
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative z-50">
            
            <div className="bg-indigo-900 p-4 text-white flex justify-between items-center">
              <div className="flex space-x-2">
                <button 
                  onClick={() => setVueActive("sujet")}
                  className={`px-4 py-2 rounded-lg font-bold transition ${vueActive === "sujet" ? "bg-white text-indigo-900" : "bg-indigo-800 text-indigo-200"}`}
                >
                  Sujet d'évaluation
                </button>

                <button 
                  onClick={() => {
                    if (!ongletActif.resultatCorrige) genererCorrige();
                    else setVueActive("corrige");
                  }}
                  disabled={isGeneratingCorrige}
                  className={`px-4 py-2 rounded-lg font-bold transition ${vueActive === "corrige" ? "bg-white text-indigo-900" : "bg-indigo-800 text-indigo-200"}`}
                >
                  {isGeneratingCorrige ? "Génération du corrigé..." : "Corrigé & Barème"}
                </button>
              </div>

              <button onClick={() => setShowModal(false)} className="text-white hover:text-red-400 text-3xl cursor-pointer">&times;</button>
            </div>
            
            <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
              <span className="text-sm font-semibold text-gray-600">
                Affichage : <strong className="uppercase">{vueActive}</strong>
              </span>
              <div className="flex space-x-4">
                <button onClick={exporterWord} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center cursor-pointer">
                  Télécharger en Word
                </button>
                <button onClick={exporterPDF} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 shadow flex items-center cursor-pointer">
                  Télécharger en PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              <div 
                id="contenu-devoir-genere"
                className="max-w-4xl mx-auto bg-white p-12 shadow-md prose prose-indigo"
                style={{ fontFamily: ongletActif.police, fontSize: `${ongletActif.taillePolice}pt` }}
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    h1: ({node, ...props}) => <h1 style={{fontSize: `${ongletActif.tailleTitres}pt`, lineHeight: ongletActif.interligne}} className="font-black text-center mb-8 uppercase text-gray-900 border-b-4 border-gray-900 pb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 style={{fontSize: `${ongletActif.tailleTitres - 4}pt`}} className="font-bold mt-12 mb-6 text-indigo-800 border-b-2 border-indigo-200 pb-2" {...props} />,
                    p: ({node, ...props}) => <p style={{lineHeight: ongletActif.interligne}} className="mb-6 text-gray-700" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto my-8"><table className="w-full border-collapse border-2 border-gray-800 shadow-sm" {...props} /></div>,
                    th: ({node, ...props}) => <th className="border-2 border-gray-800 bg-gray-200 p-3 font-bold text-gray-900 text-center" {...props} />,
                    td: ({node, ...props}) => <td className="border border-gray-400 p-3 text-gray-800 text-center" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />
                  }}
                >
                  {(vueActive === "sujet" ? ongletActif.resultatSujet : ongletActif.resultatCorrige) || ""}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
