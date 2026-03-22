import fs from 'node:fs';
import { formalize } from '../src/index';
import { VALIDATED_HARD_CASES } from '../tests/fixtures/validated-hard-cases';

async function generateReport() {
    let md = '# Comparación de Formalización: Manual vs. Algorítmica (11 Casos Difíciles Validados)\n\n';
    md += 'Este documento compara detalladamente el ejercicio original, la respuesta manual esperada (teórica) y el código de ST generado por `autologic`.\n\n';

    for (const testCase of VALIDATED_HARD_CASES) {
        console.log(`Procesando: ${testCase.id}...`);
        
        const result = formalize(testCase.text, {
            profile: testCase.profile,
            language: 'es',
            atomStyle: 'keywords',
            includeComments: true,
            validateOutput: false,
            maxClauseDepth: 6,
        });

        md += `## ${testCase.description}\n\n`;
        md += `- **ID**: \`${testCase.id}\`\n`;
        md += `- **Perfil Lógico**: \`${testCase.profile}\`\n\n`;
        md += `### 1. Ejercicio Original (Texto Natural)\n\n> ${testCase.text}\n\n`;
        
        md += `### 2. Respuesta Operativa (Humana / Manual)\n\n> ${testCase.providedAnswer}\n\n`;
        
        md += `### 3. Formalización Algorítmica Generada (Autologic ST)\n\n`;
        md += `\`\`\`st\n${result.stCode}\n\`\`\`\n\n`;
        
        if (result.stExecution) {
            md += `#### Resultado ST-Lang (runtime)\n`;
            md += `- **Válido (Compila)**: ${result.stExecution.isValid ? 'Sí ✅' : 'No ❌'}\n`;
            md += `- **Timeout (Por complejidad)**: ${result.stExecution.timedOut ? 'Sí ⏱️' : 'No ✅'}\n`;
            if (result.stExecution.errors.length > 0) {
                md += `- **Errores**: ${result.stExecution.errors.join(' | ')}\n`;
            }
            md += '\n';
        }
        
        md += `---\n\n`;
    }

    fs.writeFileSync('docs/validated-hard-cases-comparison.md', md, 'utf8');
    console.log('Reporte generado en docs/validated-hard-cases-comparison.md !');
}

generateReport().catch(console.error);
