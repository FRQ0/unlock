// Seed: cria apenas o que a plataforma precisa para funcionar
// (planos e o primeiro usuário Master). Nenhum estabelecimento fictício.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PLANS = [
  {
    code: "basico",
    name: "Básico",
    headline: "Você monta o seu cardápio no painel.",
    description: "Para quem quer autonomia: você tira as fotos, cadastra produtos e preços e publica quando quiser.",
    features: { videoFeed: false, managedByUnlock: false, maxProducts: 0 },
    highlights: [
      "Cardápio digital com a sua marca e cores",
      "Painel simples para fotos, produtos e preços",
      "Variações, adicionais e categorias livres",
      "Pedidos em tempo real no painel",
      "Link exclusivo, QR Code e plaquinha NFC",
    ],
    sortOrder: 1,
  },
  {
    code: "completo",
    name: "Completo",
    headline: "A Unlock monta e cuida de tudo para você.",
    description: "Nossa equipe cadastra o cardápio inteiro, produz os vídeos 3D dos produtos e mantém tudo atualizado.",
    features: { videoFeed: true, managedByUnlock: true, maxProducts: 0 },
    highlights: [
      "Tudo do plano Básico",
      "A equipe Unlock cadastra todo o cardápio",
      "Vídeos 3D dos seus produtos feitos pela Unlock",
      "Feed de vídeos estilo Reels dentro do cardápio",
      "Atualizações de produtos e preços pela Unlock",
    ],
    sortOrder: 2,
  },
];

async function main() {
  for (const p of PLANS) {
    await db.plan.upsert({
      where: { code: p.code },
      // Não sobrescreve preço nem textos já editados pela Unlock no Painel Master.
      update: {},
      create: { ...p, priceCents: null },
    });
  }

  const email = process.env.MASTER_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error("MASTER_PASSWORD precisa ter pelo menos 10 caracteres.");
    const exists = await db.user.findUnique({ where: { email } });
    if (!exists) {
      await db.user.create({
        data: { email, name: "Unlock Systems", role: "MASTER", passwordHash: await bcrypt.hash(password, 12), termsAcceptedAt: new Date() },
      });
      console.log(`Usuário Master criado: ${email}`);
    }
  } else {
    console.log("MASTER_EMAIL/MASTER_PASSWORD não definidos: nenhum Master criado.");
  }
}

main().finally(() => db.$disconnect());
