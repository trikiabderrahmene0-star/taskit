import Groq from "groq-sdk";
import { NextResponse } from "next/server";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // AJOUT : on récupère "cours"
    const { titre, candidat, baremeGlobal, exercices, pagesApprox, mode, cours } = body;

    const estCorrige = mode === "corrige";

    let prompt = `Tu es un professeur expert qui rédige ${estCorrige ? "un corrigé détaillé" : "un sujet d'évaluation"} pour des élèves. 
Génère UNIQUEMENT ${estCorrige ? "la correction complète pas à pas avec le barème" : "le contenu du sujet, prêt à être distribué aux élèves"}.

RÈGLES ABSOLUES :
1. ${estCorrige ? "Pour chaque question, donne la résolution complète pas à pas, la réponse finale, et détaille les points." : "AUCUN rappel de cours. Donne uniquement les exercices et les questions."}
2. N'écris JAMAIS le mot "Consignes" ou tes instructions internes.
3. BARÈME DÉTAILLÉ : Découpe les exercices en sous-questions et indique les points en gras à la fin (ex: **(1.5 pts)**).
4. MATHÉMATIQUES (FORMAT LATEX OBLIGATOIRE) : Utilise $...$ pour les formules en ligne et $$...$$ pour les blocs centrés.
5. SAUTS DE LIGNE : N'utilise JAMAIS de balises HTML comme <br> ou <br/>. Saute simplement des lignes dans le texte Markdown.

${cours ? `\n### 📚 MATÉRIEL DE COURS DE RÉFÉRENCE\nTu DOIS te baser STRICTEMENT sur le cours suivant pour formuler tes questions et tes corrections. Ne pose aucune question sur des notions qui ne sont pas abordées ici :\n"""\n${cours}\n"""\n` : ""}

# ${estCorrige ? "CORRIGÉ ET BARÈME : " : ""}${titre}

**Note globale : ...... / ${baremeGlobal} points**
${!estCorrige ? `**Nom et Prénom :** ${candidat ? candidat : "___________________________"}\n**Classe :** ___________________________\n` : ""}
---

`;

    if (exercices && exercices.length > 0) {
      exercices.forEach((exo: any) => {
        prompt += `## ${exo.titre} (Total : ${exo.points} points)\n`;
        prompt += `[INSTRUCTION SECRÈTE : Rédige ${estCorrige ? "la correction de" : ""} cet exercice d'après : "${exo.description}". Total de ${exo.points} points.]\n\n`;
      });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "qwen/qwen3.8-27b", 
    });

    const texteGenere = chatCompletion.choices[0]?.message?.content || "";
    return NextResponse.json({ result: texteGenere });

  } catch (error) {
    console.error("Erreur Backend Groq:", error);
    return NextResponse.json({ error: "Erreur IA" }, { status: 500 });
  }
}