
const fs = require('fs');
const path = 'src/pages/ProposalGenerator.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix common encoding issues
const replacements = [
    [/Ã¡/g, 'á'], [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'], [/Ãº/g, 'ú'],
    [/Ã£/g, 'ã'], [/Ãµ/g, 'õ'], [/Ã¢/g, 'â'], [/Ãª/g, 'ê'], [/Ã®/g, 'î'],
    [/Ã´/g, 'ô'], [/Ã»/g, 'û'], [/Ã§/g, 'ç'], [/â€”/g, '—'], [/Â°/g, '°'],
    [/PÃ¡gina/g, 'Página'], [/NÂº/g, 'Nº'], [/â˜€ï¸/g, '☀️'], [/ðŸ”²/g, '🔲'],
    [/âš⚡/g, '⚡'], [/ðŸ”©/g, '🔨'], [/ðŸ”Œ/g, '🔌'], [/âœ“/g, '✓'],
    [/â†/g, '←'], [/â†’/g, '→'], [/Energia RenovÃ¡vel/g, 'Energia Renovável'],
    [/HistÃ³rico/g, 'Histórico'], [/ServiÃ§os/g, 'Serviços'], [/CÃ¡lculo/g, 'Cálculo'],
    [/SimulaÃ§Ã£o/g, 'Simulação'], [/CarÃªncia/g, 'Carência'], [/PotÃªncia/g, 'Potência'],
    [/EficiÃªncia/g, 'Eficiência'], [/FixaÃ§Ã£o/g, 'Fixação'], [/InstalaÃ§Ã£o/g, 'Instalação'],
    [/EndereÃ§o/g, 'Endereço'], [/TÃ­tulo/g, 'Título'], [/PÃ GINA/g, 'PÁGINA'], [/RODAPÃ‰/g, 'RODAPÉ']
];

replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
});

// Fix Cover Page (Page 1) - using a more robust search
const newCover = `<!-- PÁGINA 1: CAPA DINÂMICA -->
        <div class="page" style="display:flex; flex-direction:column; justify-content:space-between; padding:20mm; background: linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%);">
          <div class="grid-background" style="left:0; opacity: 0.3;"></div>
          
          <!-- Cabeçalho -->
          <div style="border-bottom: 3px solid #1e3a5f; padding-bottom: 4mm; position: relative; z-index: 10;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a5f; letter-spacing: 2px;">
              MT SOLAR — ENERGIA RENOVÁVEL
            </div>
          </div>

          <!-- Centro -->
          <div style="text-align: center; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10mm; position: relative; z-index: 10;">
            <div style="width: 60mm; height: 60mm; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(30,58,95,0.15); border: 4px solid #f59e0b;">
              <div style="text-align: center;">
                <div style="font-size: 24pt; font-weight: 900; color: #1e3a5f; line-height: 1;">MT</div>
                <div style="font-size: 24pt; font-weight: 900; color: #f59e0b; line-height: 1;">SOLAR</div>
              </div>
            </div>
            
            <div style="text-transform: uppercase; letter-spacing: 4px;">
              <div style="font-size: 36pt; font-weight: 900; color: #1e3a5f; text-shadow: 2px 2px 0px #fff;">PROPOSTA</div>
              <div style="font-size: 36pt; font-weight: 900; color: #f59e0b; text-shadow: 2px 2px 0px #fff;">COMERCIAL</div>
            </div>
            
            <div style="height: 2px; width: 40mm; background: #f59e0b; border-radius: 2px;"></div>
            
            <div style="font-size: 14pt; color: #6b7280; font-weight: bold;">
              Preparada para: <span style="color: #1e3a5f;">\${formData.clientName || 'Cliente'}</span>
            </div>
          </div>

          <!-- Rodapé (UMA VEZ) -->
          <div style="border-top: 2px solid #f59e0b; padding-top: 6mm; text-align: center; font-size: 9pt; color: #6b7280; position: relative; z-index: 10;">
            <div style="display: flex; justify-content: center; gap: 6mm; flex-wrap: wrap;">
              <span>mtsolar.energia@gmail.com</span>
              <span>|</span>
              <span>@mtsolar_</span>
              <span>|</span>
              <span>Rua Rossini Roosevelt de Albuquerque, nº10 - Piedade</span>
            </div>
            <div style="margin-top: 2mm; font-weight: bold; color: #1e3a5f;">
              (81) 99700-3260 | (81) 99504-3980
            </div>
          </div>
        </div>`;

// Find the cover page block regardless of encoding
const searchMarker = 'PÁGINA 1: CAPA';
if (content.includes(searchMarker)) {
    const startIndex = content.lastIndexOf('<!--', content.indexOf(searchMarker));
    const imgIndex = content.indexOf('Pag__1.jpeg', startIndex);
    const endIndex = content.indexOf('</div>', imgIndex) + 6;
    if (startIndex !== -1 && imgIndex !== -1 && endIndex !== -1) {
        content = content.substring(0, startIndex) + newCover + content.substring(endIndex);
    }
}

// Fix accidental duplication from previous edit
content = content.replace(/<!-- CORPO DA PÁGINA -->\s+<div style="padding:8mm 14mm;">\s+<!-- CORPO DA PÁGINA -->/g, '<!-- CORPO DA PÁGINA -->');

fs.writeFileSync(path, content, 'utf8');
console.log('File updated successfully');
