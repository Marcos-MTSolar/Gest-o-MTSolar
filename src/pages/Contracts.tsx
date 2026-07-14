import React, { useState } from 'react';
import { 
  FileSignature, 
  Plus, 
  Trash2, 
  FileDown, 
  User, 
  Sun, 
  Package, 
  CreditCard, 
  Calendar as CalendarIcon,
  MapPin,
  Check,
  Building,
  Briefcase
} from 'lucide-react';
import jsPDF from 'jspdf';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface KitItem {
  id: string;
  quantity: number;
  description: string;
}

export default function Contracts() {
  const [formData, setFormData] = useState({
    // Dados do Contratante
    nome_contratante: '',
    cpf_cnpj_contratante: '',
    endereco_contratante: '',
    cep_contratante: '',
    cidade_estado_contratante: '',
    
    // Dados do Sistema
    geracao_estimada_kwh: '',
    potencia_kwp: '',
    endereco_instalacao: '',
    
    // Garantias do Sistema
    garantia_modulos_fabricacao: '20',
    garantia_modulos_eficiencia: '30',
    garantia_modulos_percentual: '80',
    garantia_inversores: '12',
    garantia_estrutura: '12',
    garantia_instalacao: '01 ano',

    // Pagamento
    valor_total: '',
    valor_extenso: '',
    forma_pagamento: '',
    
    // Integrador / Distribuidora
    nome_integrador: 'SIRIUS',
    cnpj_integrador: '35.765.147/0001-57',
    
    // Data e Local
    cidade_contrato: 'Jaboatão dos Guararapes',
    data_contrato: (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; })(),
    genero: 'masculino'
  });

  const [kitItems, setKitItems] = useState<KitItem[]>([
    { id: Math.random().toString(), quantity: 1, description: 'INVERSOR GOODWE 3.3K MONOFÁSICO 220V' }
  ]);

  const addKitItem = () => {
    setKitItems([...kitItems, { id: Math.random().toString(), quantity: 1, description: '' }]);
  };

  const removeKitItem = (id: string) => {
    if (kitItems.length > 1) {
      setKitItems(kitItems.filter(item => item.id !== id));
    }
  };

  const updateKitItem = (id: string, field: keyof KitItem, value: any) => {
    setKitItems(kitItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // BLOCO 4 — Máscara dinâmica de CPF (11 dígitos) ou CNPJ (14 dígitos)
  const formatarCpfCnpj = (valor: string): string => {
    // Remove todos os caracteres não numéricos e limita a 14 dígitos
    const numeros = valor.replace(/\D/g, '').slice(0, 14);
    if (numeros.length <= 11) {
      // Formato CPF: 000.000.000-00
      return numeros
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
    } else {
      // Formato CNPJ: 00.000.000/0000-00
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\/\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const gerarPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgTimbrado = '/Papel_-_timbrado.png';
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Carregar a logomarca e obter suas dimensões reais para calcular a altura proporcional
    let imgBase64 = '';
    let imgWidth = 0;
    let imgHeight = 0;
    try {
      const response = await fetch('/PNG_-_MT_SOLAR__1_.png');
      const blob = await response.blob();
      
      imgBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const img = new Image();
      img.src = imgBase64;
      await new Promise((resolve) => {
        img.onload = () => {
          imgWidth = img.width;
          imgHeight = img.height;
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Erro ao carregar a logomarca do contrato:', error);
    }
    
    const addBackground = () => {
      // O fundo do PDF deve ser branco puro
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    };
    
    addBackground(); // página 1
    
    doc.setFont('helvetica');
    doc.setFontSize(10);
    
    const marginLeft = 25;
    const marginTop = 35; 
    const contentWidth = 160;
    let currentY = marginTop;

    const addText = (text: string, options: { bold?: boolean, align?: string, spacing?: number, size?: number } = {}) => {
      const { bold = false, align = 'justify', spacing = 5, size = 10 } = options;
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      
      const lines = doc.splitTextToSize(text, contentWidth);
      
      if (currentY + (lines.length * spacing) > pageHeight - 30) {
        doc.addPage();
        addBackground();
        currentY = marginTop;
      }
      
      doc.text(lines, align === 'center' ? pageWidth/2 : align === 'right' ? pageWidth - marginLeft : marginLeft, currentY, { 
        align: align as any, 
        maxWidth: contentWidth 
      });
      currentY += (lines.length * spacing) + 2;
    };

    // --- Início do Conteúdo do Contrato ---
    addText('CONTRATO DE VENDA E INSTALAÇÃO DE SISTEMA DE GERAÇÃO DE ENERGIA SOLAR FOTOVOLTAICO', { bold: true, align: 'center', size: 12 });
    currentY += 5;

    addText(`Pelo presente instrumento particular de contrato de venda e instalação de sistema de geração de energia solar fotovoltaico, entre partes, a saber, de um lado, ${formData.nome_contratante || '{{ nome_contratante }}'}, ${g.portador} do CPF/CNPJ: ${formData.cpf_cnpj_contratante || '{{ cpf_cnpj_contratante }}'}, residente em ${formData.endereco_contratante || '{{ endereco_contratante }}'}, CEP ${formData.cep_contratante || '{{ cep_contratante }}'}, ${formData.cidade_estado_contratante || '{{ cidade_estado_contratante }}'}, doravante designad${g.o} CONTRATANTE.`);

    addText(`E, de outro lado, a empresa MT SOLAR ENERGIA RENOVAVEL, inscrita no CNPJ sob o nº 51.713.487/0001-90, com sede na Rua Rossini Roosevelt de Albuquerque, nº 10, sala 103, Piedade, Jaboatão dos Guararapes – PE, neste ato representa por seu sócio, Marcos Aurélio Silva do Nascimento, inscrita no CPF nº 092.375.674-48 e RG: 7.834.135 SDS/PE, adiante denominada CONTRATADA.`);

    addText('As partes acima identificadas têm, entre si, justas e acertadas o presente contrato, que se regerá pelas cláusulas seguintes:');

    addText('CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO', { bold: true });
    addText(`1.1- O presente contrato tem como objeto, a prestação, pelas CONTRATADAS, de venda e instalação completa dos equipamentos de um sistema de energia solar fotovoltaico para microgeração de energia de estimadamente ${formData.geracao_estimada_kwh || '{{ geracao_estimada_kwh }}'} kWh mensal, de modo a atingir uma potência nominal de ${formData.potencia_kwp || '{{ potencia_kwp }}'} kWp (Quilowatt-pico).`);
    addText(`1.2- O equipamento adquirido será instalado no endereço: ${formData.endereco_instalacao || '{{ endereco_instalacao }}'}`);

    addText('KIT FOTOVOLTAICO:', { bold: true });
    // BLOCO 5 — Tabela manual do kit: Item | Qtd. | Produto
    const colWidths = [contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.70];
    const colX = [marginLeft, marginLeft + colWidths[0], marginLeft + colWidths[0] + colWidths[1]];
    const kitRowHeight = 7;
    const kitHeaderHeight = 7;

    const desenharCabecalhoKit = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(230, 235, 245);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(marginLeft, currentY, contentWidth, kitHeaderHeight, 'FD');
      doc.setTextColor(30, 30, 30);
      doc.text('Item', colX[0] + 2, currentY + 5);
      doc.text('Qtd.', colX[1] + 2, currentY + 5);
      doc.text('Produto', colX[2] + 2, currentY + 5);
      currentY += kitHeaderHeight;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
    };

    if (currentY + kitHeaderHeight + kitRowHeight > pageHeight - 30) {
      doc.addPage();
      addBackground();
      currentY = marginTop;
    }
    desenharCabecalhoKit();

    kitItems.forEach((item, idx) => {
      const numItem = String(idx + 1).padStart(2, '0');
      const qtdStr = String(item.quantity);
      const descStr = item.description;
      const descLines = doc.splitTextToSize(descStr, colWidths[2] - 4);
      const cellHeight = Math.max(kitRowHeight, descLines.length * 5 + 2);
      if (currentY + cellHeight > pageHeight - 30) {
        doc.addPage();
        addBackground();
        currentY = marginTop;
        desenharCabecalhoKit();
      }
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(marginLeft, currentY, contentWidth, cellHeight, 'D');
      doc.line(colX[1], currentY, colX[1], currentY + cellHeight);
      doc.line(colX[2], currentY, colX[2], currentY + cellHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(numItem, colX[0] + 2, currentY + 5);
      doc.text(qtdStr, colX[1] + 2, currentY + 5);
      doc.text(descLines, colX[2] + 2, currentY + 5);
      currentY += cellHeight;
    });
    doc.setFontSize(10);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    currentY += 8;

    addText('CLÁUSULA SEGUNDA – DESCRIÇÃO DOS TRABALHOS A REALIZAR', { bold: true });
    addText('Os trabalhos relacionados ao objeto acima identificado compreendem equipamentos, mão de obra e acessórios para instalação de sistemas de energia fotovoltaico, desde a elaboração do projeto até a homologação do sistema junto a concessionária de sua região.');
    addText('Os equipamentos, ferramentas, mão de obra, segurança e acessórios para realização dos trabalhos são de inteira responsabilidade da CONTRATADA.');
    addText('Nos equipamentos e materiais a fornecer pela empresa CONTRATADA, estarão compreendidos:');
    addText('- Painéis solares certificados;');
    addText('- Estruturas de fixação para campo de painéis;');
    addText('- Cabeamentos DC e AC devidamente certificados e de características adequadas;');
    addText('- Inversor de frequência certificado;');
    addText('- Quadro de proteção (String box), quando necessário.');
    addText('2.4- Os serviços contratados incluem projeto inicial, ART, tratativas junto à concessionária local, instalação total dos equipamentos, cercamento do local, construção da casa de máquina, limpeza do terreno, serviços de engenharia e homologação do sistema.');

    addText('CLÁUSULA TERCEIRA – PREÇO E FORMA DE PAGAMENTO', { bold: true });
    addText(`- Como pagamento pela aquisição do sistema fotovoltaico e pelos serviços prestados, o CONTRATANTE pagará a CONTRATADA a quantia total de R$ ${parseFloat(formData.valor_total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${formData.valor_extenso || '{{ valor_extenso }}'}).`);
    addText(`- O pagamento à CONTRATADA será efetuado da seguinte forma: ${formData.forma_pagamento || '{{ forma_pagamento }}'}.`);

    addText('CLÁUSULA QUARTA – DO PRAZO, ENTREGA E EXECUÇÃO DOS SERVIÇOS', { bold: true });
    addText('A administração, supervisão e gerenciamento no que tange à execução de todos os serviços prestados pelos profissionais encaminhados pela CONTRATADA, ficarão sob responsabilidade exclusiva da mesma.');
    addText('A entrega dos equipamentos está condicionada à quitação do pagamento do valor total do material referente ao sistema solar fotovoltaico, conforme a clausula terceira.');
    addText('A instalação será executada durante a semana e em horário comercial, prevê um acabamento aparente com uso de canaletas e/ou eletrodutos.');
    addText('O prazo total de implantação, que compreende desde o pagamento do valor contratado, descrito na clausula terceira, até a homologação do projeto, é de até 30 dias, podendo ser estendido por até 30 dias em decorrência dos prazos da concessionária local. Prazo que ficará suspenso em caso de não conformidade da Infra Estrutura necessária, descrita na Clausula sexta, item e.');

    addText('CLÁUSULA QUINTA – OBRIGAÇÕES DA CONTRATADA', { bold: true });
    addText('Em cumprimento ao objeto do presente instrumento, são obrigações exclusivas da CONTRATADA:');
    addText('- Planejar, conduzir e executar os serviços, com integral observância das disposições deste Contrato, obedecendo aos prazos contratuais e às normas vigentes;');
    addText('- Fornecer ao CONTRATANTE todos os dados solicitados que se fizerem necessários ao bom entendimento e acompanhamento do serviço contratado;');
    addText('- Executar a instalação de acordo com as normas técnicas oficiais em vigor;');
    addText('- Auxiliar o CONTRATANTE no monitoramento do sistema de geração fotovoltaico de Gestão de Energia até 01 (Um) ano. Podendo, após isso, o CONTRATANTE renovar o contrato com a CONTRATADA para dar continuidade ao monitoramento.');
    addText('- Atender às possíveis ocorrências de falha nos equipamentos, objeto deste contrato, após serem reportadas pelo CONTRATANTE.');
    addText('- Realizar o contato com os fabricantes dos equipamentos em caso de falha que exija substituição ou reparo, gerenciando o envio e recebimento para troca ou reparo; não se responsabilizando por eventuais cobranças no período de pausa na produção até o reestabelecimento do sistema;');
    addText('- É de responsabilidade da CONTRATADA viabilizar para o CONTRATANTE todo o processo de compra do equipamento, independente do fornecedor;');
    addText('- Respeitar e fazer com que seus colaboradores respeitem as normas de segurança e higiene no trabalho, incluindo o devido uso de EPIs e EPCs;');
    addText('- Assumir integral responsabilidade pelas obrigações de natureza trabalhista e/ou previdenciária relativas aos trabalhadores alocados para a execução dos serviços.');

    addText('CLÁUSULA SEXTA – OBRIGAÇÕES DA CONTRATANTE', { bold: true });
    addText('São obrigações do CONTRATANTE:');
    addText('- Disponibilizar espaço seguro para armazenamento do equipamento, desde a entrega até a conclusão das instalações;');
    addText('- Comunicar previamente à CONTRATADA qualquer modificação e/ou criação de novos procedimentos a serem adotados;');
    addText('- Efetuar todos os pagamentos ora contratados, responsabilizando-se por todos os ônus decorrentes do não cumprimento desta obrigação contratual;');
    addText('- Relatar à CONTRATADA toda e qualquer irregularidade ou falha dos equipamentos ou nos serviços prestados, bem como realizar as manutenções periódicas do equipamento;');
    addText('- Fornecer toda a infraestrutura necessária para a execução dos serviços e para o funcionamento do sistema, compreendida por: rede de internet no local de instalação do(s) inversor(es), local adequado para colocação do(s) inversor(es) interativo(s), superfície (telhado) em condições adequadas para instalação do sistema fotovoltaico, infraestrutura de aterramento próxima ao local de instalação do sistema fotovoltaico, cabeamento adequado para conexão do(s) inversor(es) à rede disponível em quadro elétrico próximo do local de instalação e quaisquer outras necessidades estruturais apontadas, após avaliação técnica, pelos profissionais da CONTRATADA.');
    addText('- Manter em dia as faturas de energia que farão parte do projeto para que não haja impeditivo no processo homologatório junto à concessionária;');
    addText('- Informar os dados das contas que serão inclusas no projeto e, caso não estejam no mesmo CPF/CNPJ, autorizar ou realizar a troca de titularidade junto à concessionária;');
    addText('OBS: Solicitamos laudo estrutural reconhecido por Engenheiro ou técnico estrutural. Não nos responsabilizamos por problemas já existentes no telhado.');

    addText('CLÁUSULA SÉTIMA – EXCLUSÕES', { bold: true });
    addText('7.1 A CONTRATADA não é, de nenhuma forma, responsável caso haja alterações em regulamentos, normas ou leis que modifiquem as especificações técnicas necessárias para instalações fotovoltaicas após a entrega do sistema pronto ao CONTRATANTE.');
    addText('- A CONTRATADA não se responsabiliza por danos causados na rede elétrica da edificação caso não tenham sido comprovadamente causados pelo sistema fotovoltaico. A comprovação deve se dar através de laudo técnico emitido por empresa ou engenheiro eletricista;');
    addText('- Não estão inclusos no escopo deste contrato adaptações na rede elétrica da edificação não estritamente relacionadas à instalação do sistema, como: troca de lâmpadas, troca ou conserto de quadros elétricos, consertos de tomadas, passagem de cabos, malha de terra existente, SPDA, sistema de combate a incêndio, ou quaisquer outros itens não necessários à operação do sistema fotovoltaico;');
    addText('- A CONTRATADA não será responsável por ineficácia dos equipamentos já instalados de energia solar fotovoltaica no caso de força maior ou caso fortuito, como: tempestades, guerras, desordens, sabotagens e atos terroristas na forma prevista em lei. Casos de força maior estão diretamente ligados a desastres decorrentes da natureza que podem comprometer a eficácia dos equipamentos devido ao fato do mesmo depender das condições climáticas da região;');
    addText('- Este contrato não celebra nenhum serviço ou adaptação de natureza civil, estando assim sob responsabilidade do CONTRATANTE;');
    addText('- O projeto de execução elaborado pela empresa CONTRATADA baseia-se nas contas de energia e consumo adicional fornecidas pelo CONTRATANTE. Sendo assim, havendo aumento do consumo diferente daquele previsto no projeto, a CONTRATADA não se responsabiliza pela não compensação do consumo excedente, tendo em vista a incapacidade do sistema instalado de suprir uma quantidade de energia superior àquela para a qual foi exclusivamente dimensionado.');
    addText('- Os valores de produção do sistema são estimados e podem sofrer variações em decorrência das condições climáticas. Portanto, a CONTRATADA não garante os exatos valores de geração e produção;');
    addText('- Os cálculos de economia e projeção financeira informados na proposta comercial são estimados e podem alterar em decorrência dos reajustes inflacionários e energéticos.');

    addText('CLÁUSULA OITAVA – DA RESCISÃO CONTRATUAL', { bold: true });
    addText('8.1- A eventual rescisão do presente contrato, por culpa ou descumprimento das obrigações por qualquer das partes, acarretará à parte infratora o pagamento, à outra parte, de multa penal fixada em 10% (dez por cento) do valor total do negócio, além da responsabilidade por perdas e danos e pelo pagamento dos ônus sucumbenciais, custas e honorários advocatícios.');
    addText(`8.2- Em havendo desistência por parte d${g.o} CONTRATANTE, que não seja ocasionada por negativa de crédito ou inviabilidade técnica, fica ${g.artigo} CONTRATANTE ${g.obrigado} a pagar à CONTRATADA os custos referentes à vistoria, preparação e execução do projeto até o momento da rescisão, limitado a 10% (dez por cento) do valor total do contrato.`);

    addText('CLÁUSULA NONA – DIREITO DE IMAGEM', { bold: true });
    addText('9.1- O CONTRATANTE autoriza, de forma gratuita e sem qualquer ônus, a CONTRATADA a utilização de imagem dos serviços desenvolvidos, com o intuito de vinculá-los aos meios de comunicação da CONTRATADA, bem como sites, artigos, matérias jornalísticas etc.');

    addText('CLÁUSULA DÉCIMA – CONDIÇÕES GERAIS', { bold: true });
    addText('- O presente CONTRATO irá vigorar pelo prazo de 12 meses, contados da data da correspondente assinatura, podendo ser prorrogado por acordo comum e escrito entre as PARTES, mediante celebração de aditivo;');
    addText('- O CONTRATANTE poderá ceder ou transferir, total ou parcialmente, os direitos e obrigações decorrentes deste contrato desde que acordado entre as partes e documentado em aditivo contratual;');
    addText('- Na falta dos equipamentos descritos no ANEXO A, a CONTRATADA poderá substituí-los, desde que sejam de mesmas características ou superior;');
    addText('- As partes poderão rescindir o presente contrato, independentemente de qualquer notificação judicial ou extrajudicial, nas seguintes hipóteses: inadimplência reiterada de qualquer cláusula ou condição do presente contrato; nos demais casos previstos em lei;');
    addText('- Ressalta-se que a CONTRATADA comercializa módulos fotovoltaicos de potências distintas, onde, a depender da potência fornecida por cada módulo, a potência pico pode variar algumas casas decimais, porém sem influenciar na geração dimensionada;');
    addText('- A depender das condições arquitetônicas e civis do estabelecimento, o projeto pode sofrer alterações em relação à potência instalada e consequentemente ter o seu valor final modificado;');
    addText('- A CONTRATADA deverá realizar as manutenções periódicas do Sistema Fotovoltaico, conforme manuais dos fabricantes, através de profissionais qualificados, de forma a garantir a integridade dos equipamentos e eficiência de produção.');

    addText('CLÁUSULA DÉCIMA PRIMEIRA – GARANTIAS E SEGURO', { bold: true });
    addText('As garantias do sistema solar fotovoltaico são:');
    addText(`- Módulos: ${formData.garantia_modulos_fabricacao} anos contra defeito de fabricação e ${formData.garantia_modulos_eficiencia} anos contra queda de eficiência de até ${formData.garantia_modulos_percentual}%;`);
    addText(`- Inversores: ${formData.garantia_inversores} anos contra defeito de fabricação;`);
    addText(`- Estrutura Metálica: ${formData.garantia_estrutura} anos;`);
    addText(`- Serviço de Instalação: ${formData.garantia_instalacao}.`);
    addText('- A garantia não cobre incidentes naturais como descargas elétricas, tempestades e mau uso;');
    addText('- A garantia é do fabricante, tendo a CONTRATADA o dever de viabilizar a troca de eventual problema, observando sempre as disposições da cláusula sétima;');
    addText('- A não observação das instruções de instalação constantes no manual dos fabricantes, ou a utilização indevida dos produtos, anulam as garantias e podem incorrer em riscos à segurança física e material.');

    addText('CLÁUSULA DÉCIMA SEGUNDA – DO FORO', { bold: true });
    addText('As partes elegem o Foro da Comarca da cidade de Jaboatão dos Guararapes – Pernambuco, para dirimir qualquer questão decorrente deste contrato, com exclusão de qualquer outro, por mais privilegiado que seja.');

    // BLOCO 2 — Calcular altura total do bloco final para garantir que parágrafo,
    // data e assinaturas fiquem sempre na mesma página, nunca separados.
    const textoFinal = 'E por estarem assim justas e acertadas, as partes firmam o presente instrumento em 2 (duas) vias de igual teor e forma, tudo na presença das duas testemunhas abaixo.';
    const linhasFinal = doc.splitTextToSize(textoFinal, contentWidth);
    const alturaParaFinal = (linhasFinal.length * 5) + 2;
    // Cálculo preciso da altura real necessária para evitar quebras de página prematuras:
    // alturaParaFinal + 10 (espaço) + 7 (data) + 20 (espaço) + 5 (margem linha) + 6 (linhas de texto labels) = alturaParaFinal + 48
    const alturaTotalBlocoFinal = alturaParaFinal + 48;
    if (currentY + alturaTotalBlocoFinal > pageHeight - 30) {
      doc.addPage();
      addBackground();
      currentY = marginTop;
    }

    addText(textoFinal);

    // BLOCO 3 — Formatação da data usando métodos locais para evitar problema de fuso UTC
    currentY += 10;
    const mesesPtBR = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const [anoData, mesData, diaData] = formData.data_contrato.split('-').map(Number);
    const dataFormatada = `${diaData} de ${mesesPtBR[mesData - 1]} de ${anoData}`;
    addText(`${formData.cidade_contrato} - PE, ${dataFormatada}.`, { align: 'center' });

    currentY += 20;
    doc.line(marginLeft, currentY, marginLeft + 70, currentY);
    doc.line(pageWidth - marginLeft - 70, currentY, pageWidth - marginLeft, currentY);
    
    currentY += 5;
    doc.setFontSize(8);
    doc.text('MT SOLAR ENERGIA RENOVAVEL\n51.713.487/0001-90', marginLeft + 35, currentY, { align: 'center' });
    doc.text(`${formData.nome_contratante || 'CONTRATANTE'}\n${formData.cpf_cnpj_contratante || ''}`, pageWidth - marginLeft - 35, currentY, { align: 'center' });

    // Loop pós-geração para desenhar o rodapé padrão e a marca d'água em todas as páginas do contrato
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Adicionar marca d'água se a imagem foi carregada com sucesso
      if (imgBase64 && imgWidth > 0 && imgHeight > 0) {
        const watermarkWidth = 120;
        const watermarkHeight = (watermarkWidth * imgHeight) / imgWidth;
        const x = (pageWidth - watermarkWidth) / 2;
        const y = (pageHeight - watermarkHeight) / 2;
        
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 0.35 }));
        doc.addImage(imgBase64, 'PNG', x, y, watermarkWidth, watermarkHeight);
        // @ts-ignore
        doc.setGState(new doc.GState({ opacity: 1.0 }));
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      
      // Linha separadora discreta no rodapé (25mm a partir da base)
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(marginLeft, pageHeight - 25, pageWidth - marginLeft, pageHeight - 25);
      
      // Informações da empresa do rodapé (dentro dos 25mm reservados)
      const footerTextLine1 = "MT SOLAR ENERGIA RENOVAVEL — CNPJ: 51.713.487/0001-90";
      const footerTextLine2 = "mtsolar.energia@gmail.com | (81) 99700-3260 | (81) 99951-7110";
      const footerTextLine3 = "Rua Rossini Roosevelt de Albuquerque, nº 10, sala 103, Piedade, Jaboatão dos Guararapes - PE";
      
      doc.text(footerTextLine1, pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text(footerTextLine2, pageWidth / 2, pageHeight - 16, { align: 'center' });
      doc.text(footerTextLine3, pageWidth / 2, pageHeight - 12, { align: 'center' });
      
      // Paginação
      const pageText = `Página ${i} de ${totalPages}`;
      doc.text(pageText, pageWidth - marginLeft, pageHeight - 8, { align: 'right' });
    }

    const dataFormatadaArquivo = new Date(formData.data_contrato).toLocaleDateString('pt-BR').replace(/\//g, '-');
    doc.save(`Contrato_${formData.nome_contratante || 'Cliente'}_${dataFormatadaArquivo}.pdf`);
  };

  const inputStyle = "w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 transition-all focus:bg-white text-sm";
  const labelStyle = "block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  const g = formData.genero === 'feminino'
    ? { artigo: 'a', portador: 'portadora', obrigado: 'obrigada', designado: 'designada', o: 'a' }
    : { artigo: 'o', portador: 'portador', obrigado: 'obrigado', designado: 'designado', o: 'o' };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-amber-400 p-2.5 rounded-lg shadow-lg shadow-amber-400/20">
            <FileSignature className="text-blue-900 w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-blue-900 tracking-tight uppercase">Gerador de Contratos</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">
          {/* Formulário (60%) */}
          <div className="xl:col-span-6 space-y-6">
            {/* Dados do Contratante */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className="w-10 h-10 bg-blue-100 text-blue-900 rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Qualificação do Contratante</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
                <div className="md:col-span-2">
                  <label className={labelStyle}>Nome Completo / Razão Social</label>
                  <input 
                    value={formData.nome_contratante} 
                    onChange={e => updateForm('nome_contratante', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div>
                  <label className={labelStyle}>CPF / CNPJ</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={18}
                    value={formData.cpf_cnpj_contratante}
                    onChange={e => updateForm('cpf_cnpj_contratante', formatarCpfCnpj(e.target.value))}
                    className={inputStyle}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className={labelStyle}>CEP</label>
                  <input 
                    value={formData.cep_contratante} 
                    onChange={e => updateForm('cep_contratante', e.target.value)}
                    className={inputStyle}
                    placeholder="00000-000"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Gênero do Contratante</label>
                  <div className="flex gap-3">
                    {[
                      { val: 'masculino', label: '♂ Masculino' },
                      { val: 'feminino',  label: '♀ Feminino'  },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => updateForm('genero', opt.val)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                          ${formData.genero === opt.val
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className={labelStyle}>Endereço Completo</label>
                  <input 
                    value={formData.endereco_contratante} 
                    onChange={e => updateForm('endereco_contratante', e.target.value)}
                    className={inputStyle}
                    placeholder="Rua, número, bairro..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelStyle}>Cidade – UF</label>
                  <input 
                    value={formData.cidade_estado_contratante} 
                    onChange={e => updateForm('cidade_estado_contratante', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: Recife – PE"
                  />
                </div>
              </div>
            </section>

            {/* Dados do Sistema */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-amber-100 text-amber-900 rounded-xl flex items-center justify-center">
                  <Sun size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Dados do Sistema Solar</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>Geração Estimada (kWh/mês)</label>
                  <input 
                    value={formData.geracao_estimada_kwh} 
                    onChange={e => updateForm('geracao_estimada_kwh', e.target.value)}
                    className={inputStyle}
                    type="number"
                    placeholder="Ex: 300"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Potência (kWp)</label>
                  <input 
                    value={formData.potencia_kwp} 
                    onChange={e => updateForm('potencia_kwp', e.target.value)}
                    className={inputStyle}
                    type="number"
                    placeholder="Ex: 2.44"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelStyle}>Endereço de Instalação</label>
                  <input 
                    value={formData.endereco_instalacao} 
                    onChange={e => updateForm('endereco_instalacao', e.target.value)}
                    className={inputStyle}
                    placeholder="Onde o sistema será instalado"
                  />
                </div>
              </div>
            </section>

            {/* Integrador / Distribuidora */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-orange-100 text-orange-900 rounded-xl flex items-center justify-center">
                  <Building size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Integrador / Distribuidora</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>Nome do Integrador</label>
                  <input 
                    value={formData.nome_integrador} 
                    onChange={e => updateForm('nome_integrador', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: SIRIUS"
                  />
                </div>
                <div>
                  <label className={labelStyle}>CNPJ do Integrador</label>
                  <input 
                    value={formData.cnpj_integrador} 
                    onChange={e => updateForm('cnpj_integrador', e.target.value)}
                    className={inputStyle}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>
            </section>

            {/* Kit Fotovoltaico */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-900 rounded-xl flex items-center justify-center">
                    <Package size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Kit Fotovoltaico</h2>
                </div>
                <button 
                  onClick={addKitItem}
                  className="flex items-center gap-2 text-xs font-bold border border-blue-900 text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Plus size={16} /> Adicionar Item
                </button>
              </div>
              
              <div className="space-y-4">
                {kitItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-end group">
                    <div className="w-20">
                      <label className={labelStyle}>Qtd</label>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={e => updateKitItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className={cn(inputStyle, "text-center px-2")}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={labelStyle}>Descrição</label>
                      <input 
                        value={item.description}
                        onChange={e => updateKitItem(item.id, 'description', e.target.value)}
                        className={inputStyle}
                        placeholder="Ex: Módulo Solar 550W..."
                      />
                    </div>
                    <button 
                      onClick={() => removeKitItem(item.id)}
                      className="p-3.5 text-gray-300 hover:text-red-500 bg-gray-50 rounded-xl hover:bg-red-50 transition-all mb-0.5"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Garantias do Sistema */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-100 text-blue-900 rounded-xl flex items-center justify-center">
                  <Check size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Garantias do Sistema</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>Módulos: Fabricaçâo (Anos)</label>
                  <input 
                    value={formData.garantia_modulos_fabricacao} 
                    onChange={e => updateForm('garantia_modulos_fabricacao', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 20"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Módulos: Eficiência (Anos)</label>
                  <input 
                    value={formData.garantia_modulos_eficiencia} 
                    onChange={e => updateForm('garantia_modulos_eficiencia', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 30"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Módulos: % Eficiência Mínima</label>
                  <input 
                    value={formData.garantia_modulos_percentual} 
                    onChange={e => updateForm('garantia_modulos_percentual', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 80"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Inversores (Anos)</label>
                  <input 
                    value={formData.garantia_inversores} 
                    onChange={e => updateForm('garantia_inversores', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 12"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Estrutura Metálica (Anos)</label>
                  <input 
                    value={formData.garantia_estrutura} 
                    onChange={e => updateForm('garantia_estrutura', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 12"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Serviço de Instalação</label>
                  <input 
                    value={formData.garantia_instalacao} 
                    onChange={e => updateForm('garantia_instalacao', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: 01 ano"
                  />
                </div>
              </div>
            </section>

            {/* Dados de Pagamento */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-green-100 text-green-900 rounded-xl flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Pagamento</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>Valor Total (R$)</label>
                  <input 
                    value={formData.valor_total} 
                    onChange={e => updateForm('valor_total', e.target.value)}
                    className={cn(inputStyle, "font-bold text-blue-900")}
                    type="number"
                    placeholder="7508.00"
                  />
                </div>
                <div>
                  <label className={labelStyle}>Valor por Extenso</label>
                  <input 
                    value={formData.valor_extenso} 
                    onChange={e => updateForm('valor_extenso', e.target.value)}
                    className={inputStyle}
                    placeholder="Ex: Sete mil..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelStyle}>Forma de Pagamento</label>
                  <textarea 
                    value={formData.forma_pagamento} 
                    onChange={e => updateForm('forma_pagamento', e.target.value)}
                    className={cn(inputStyle, "h-32 resize-none")}
                    placeholder="Ex: à vista, dados bancários..."
                  />
                </div>
              </div>
            </section>

            {/* Data e Local */}
            <section className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-red-100 text-red-900 rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Data e Local</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelStyle}>Cidade do Contrato</label>
                  <input 
                    value={formData.cidade_contrato} 
                    onChange={e => updateForm('cidade_contrato', e.target.value)}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Data</label>
                  <input 
                    type="date"
                    value={formData.data_contrato} 
                    onChange={e => updateForm('data_contrato', e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Pré-visualização (40%) */}
          <div className="xl:col-span-4 h-fit space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 sticky top-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 uppercase tracking-tight">
                  <Check size={20} className="text-green-500" />
                  Preview do Contrato
                </h3>
                <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-widest">Texto Real</span>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-100 h-[650px] overflow-y-auto text-[10px] leading-relaxed text-gray-600 font-serif">
                <div className="text-center mb-8 border-b border-gray-200 pb-4">
                  <p className="font-bold text-gray-800 uppercase tracking-tighter text-xs">CONTRATO DE VENDA E INSTALAÇÃO</p>
                </div>
                
                <p className="mb-4 indent-6">
                  Pelo presente instrumento, de um lado <strong>{formData.nome_contratante || '{{ CLIENTE }}'}</strong>, 
                  inscrito no CPF/CNPJ <strong>{formData.cpf_cnpj_contratante || '{{ CPF/CNPJ }}'}</strong>, 
                  e de outro lado <strong>MT SOLAR ENERGIA RENOVAVEL (CNPJ 51.713.487/0001-90)</strong>, 
                  ajustam o presente contrato.
                </p>
                
                <div className="space-y-4">
                  <p><strong>CLÁUSULA 1:</strong> Objeto é o sistema de <strong>{formData.potencia_kwp || '{{ POWER }}'} kWp</strong> com geração de <strong>{formData.geracao_estimada_kwh || '{{ GEN }}'} kWh/mês</strong>.</p>
                  
                  <p><strong>ITENS DO KIT:</strong></p>
                  <ul className="list-none space-y-1 ml-4 border-l-2 border-amber-400 pl-4">
                    {kitItems.map((item, i) => (
                      <li key={i}>{String(i+1).padStart(2, '0')} – {item.quantity}x {item.description || '...'}</li>
                    ))}
                  </ul>

                  <p><strong>CLÁUSULA 2:</strong> Serviços incluem projeto, ART, instalação, cercamento e homologação.</p>

                  <p><strong>VALOR TOTAL:</strong> R$ {parseFloat(formData.valor_total || '0').toLocaleString('pt-BR')} ({formData.valor_extenso || '...'}).</p>
                  
                  <p><strong>PAGAMENTO:</strong> {formData.forma_pagamento || '...'}</p>

                  <p className="text-[8px] text-gray-400 mt-8 italic">* O contrato final conterá todas as 12 cláusulas jurídicas detalhadas.</p>
                </div>

                <div className="mt-16 text-center border-t border-gray-100 pt-8">
                  <p>{formData.cidade_contrato}, {new Date(formData.data_contrato).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  
                  <div className="mt-12 grid grid-cols-2 gap-8">
                    <div className="border-t border-gray-400 pt-2 font-bold text-gray-800 uppercase">MT SOLAR</div>
                    <div className="border-t border-gray-400 pt-2 font-bold text-gray-800 uppercase truncate px-2">{formData.nome_contratante || 'CONTRATANTE'}</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-blue-900 rounded-xl shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-800 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform"></div>
                  <div className="bg-amber-400 p-2 rounded-lg text-blue-900 relative z-10">
                    <Briefcase size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Integrador Sirius</p>
                    <p className="text-[11px] text-white font-bold">Marcos Aurélio Silva</p>
                  </div>
                </div>
                
                <button
                  onClick={gerarPDF}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-blue-900 font-black py-5 rounded-xl shadow-xl shadow-amber-400/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs border-b-4 border-amber-600 active:border-b-0 active:translate-y-1"
                >
                  <FileDown size={20} />
                  Gerar Contrato PDF
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
              <div className="bg-blue-900 p-2.5 rounded-lg text-white shadow-md">
                <Building size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900 uppercase tracking-tight">Dados da Sede</h4>
                <p className="text-[10px] text-blue-800/70 leading-relaxed mt-1 font-medium">
                  Rua Rossini Roosevelt de Albuquerque, nº 10, Piedade<br/>
                  Jaboatão dos Guararapes – PE<br/>
                  CNPJ: 51.713.487/0001-90
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
