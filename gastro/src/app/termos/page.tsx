import type { Metadata } from "next";
import { LegalPage, contact } from "../LegalPage";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Terms() {
  return (
    <LegalPage title="Termos de uso" updated="24/11/2026">
      <p>Estes termos regem o uso da plataforma Unlock Gastro, oferecida pela Unlock Systems, por estabelecimentos gastronômicos (“assinantes”).</p>
      <h2>O serviço</h2>
      <p>A Unlock Gastro oferece cardápio digital personalizável, feed de vídeos (conforme o plano), recebimento de pedidos, QR Code e suporte à plaquinha NFC. Os recursos de cada plano estão descritos na página de planos.</p>
      <h2>Conta e responsabilidades do assinante</h2>
      <ul>
        <li>Manter os dados de acesso em sigilo e informações cadastrais corretas.</li>
        <li>Responder pelo conteúdo publicado (fotos, vídeos, preços, descrições), que deve ser verdadeiro e ter direitos de uso.</li>
        <li>Tratar os dados dos seus clientes conforme a LGPD, usando-os apenas para atender os pedidos.</li>
        <li>Honrar os pedidos recebidos e os preços exibidos no cardápio.</li>
      </ul>
      <h2>Assinatura e pagamento</h2>
      <p>O serviço é cobrado por assinatura mensal, no valor do plano escolhido. O cardápio fica disponível ao público enquanto a assinatura estiver ativa. Em caso de atraso, a conta pode ser suspensa até a regularização. Os dados são mantidos durante a suspensão.</p>
      <h2>Plano Completo</h2>
      <p>No plano Completo, a equipe Unlock cadastra e atualiza o cardápio e produz vídeos dos produtos a partir de fotos e informações enviadas pelo assinante, que aprova o conteúdo.</p>
      <h2>Cancelamento</h2>
      <p>O assinante pode cancelar a qualquer momento. Após o cancelamento, o cardápio sai do ar. O assinante pode exportar seus dados pelo painel antes de cancelar.</p>
      <h2>Contato</h2>
      <p>Dúvidas sobre estes termos: {contact()}.</p>
    </LegalPage>
  );
}
