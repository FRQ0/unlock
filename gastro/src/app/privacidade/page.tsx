import type { Metadata } from "next";
import { LegalPage, contact } from "../LegalPage";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacy() {
  return (
    <LegalPage title="Política de privacidade" updated="24/11/2026">
      <p>Esta política explica como a plataforma Unlock Gastro, da Unlock Systems, trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>
      <h2>Quem é responsável pelos dados</h2>
      <p>Os <strong>donos de estabelecimentos</strong> que usam a plataforma são os controladores dos dados dos seus clientes (quem faz pedidos no cardápio). A Unlock Systems atua como operadora, tratando esses dados apenas para prestar o serviço. Para os dados de cadastro dos próprios estabelecimentos, a Unlock Systems é a controladora.</p>
      <h2>Quais dados coletamos</h2>
      <ul>
        <li><strong>Donos e equipes:</strong> nome, e-mail, senha (guardada de forma criptografada, nunca em texto), dados do estabelecimento e registros de acesso.</li>
        <li><strong>Clientes que fazem pedidos:</strong> nome, e o necessário para o tipo de atendimento — número da mesa, telefone para retirada/entrega e endereço para entrega — além dos itens do pedido.</li>
        <li><strong>Visitantes do cardápio:</strong> contamos quantas vezes cada produto é visto, sem identificar quem viu. Não usamos cookies de publicidade.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Preparar, entregar e acompanhar o pedido (base legal: execução de contrato e consentimento dado no envio do pedido).</li>
        <li>Manter a conta do estabelecimento, cobrar a assinatura e dar suporte.</li>
        <li>Segurança, prevenção a fraudes e cumprimento de obrigações legais.</li>
      </ul>
      <h2>Compartilhamento</h2>
      <p>Os dados de um pedido são vistos apenas pelo estabelecimento que o recebeu e pela equipe Unlock quando necessário para suporte. Um estabelecimento nunca acessa dados de outro. Usamos provedores de hospedagem, banco de dados e armazenamento de arquivos que seguem padrões de segurança de mercado.</p>
      <h2>Por quanto tempo guardamos</h2>
      <p>Pelo tempo necessário para as finalidades acima e para obrigações legais. O estabelecimento pode anonimizar os dados dos clientes de pedidos antigos a qualquer momento pelo painel.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir confirmação, acesso, correção, anonimização, portabilidade ou exclusão dos seus dados, e revogar o consentimento. Se você fez um pedido, procure primeiro o estabelecimento. Também pode falar com a Unlock Systems por {contact()}.</p>
      <h2>Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), senhas com hash, separação de dados por estabelecimento, controle de acesso por perfil e registro das ações administrativas.</p>
    </LegalPage>
  );
}
