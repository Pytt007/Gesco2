import { TemplateBlock, BlockConfiguration } from './types';

/**
 * Moteur de mise en page (Layout Engine) pour le Template Builder GESCO
 * Génère le style CSS, la grille et la mise en page dynamique de chaque bloc.
 */
export const layoutEngine = {
  /**
   * Génère la chaîne de règles CSS en ligne à partir de la configuration d'un bloc
   */
  generateBlockStyles(block: TemplateBlock): string {
    const cfg: BlockConfiguration = block.configuration || {};
    const styles: string[] = [];

    if (cfg.width) styles.push(`width: ${cfg.width};`);
    if (cfg.height) styles.push(`height: ${cfg.height};`);
    if (cfg.fontFamily) styles.push(`font-family: ${cfg.fontFamily};`);
    if (cfg.fontSize) styles.push(`font-size: ${cfg.fontSize};`);
    if (cfg.fontWeight) styles.push(`font-weight: ${cfg.fontWeight};`);
    if (cfg.color) styles.push(`color: ${cfg.color};`);
    if (cfg.backgroundColor) styles.push(`background-color: ${cfg.backgroundColor};`);
    if (cfg.alignment) styles.push(`text-align: ${cfg.alignment};`);
    if (cfg.marginTop) styles.push(`margin-top: ${cfg.marginTop};`);
    if (cfg.marginBottom) styles.push(`margin-bottom: ${cfg.marginBottom};`);
    if (cfg.padding) styles.push(`padding: ${cfg.padding};`);
    if (cfg.border) styles.push(`border: ${cfg.border};`);
    if (cfg.borderRadius) styles.push(`border-radius: ${cfg.borderRadius};`);

    // Masquage si visible = false
    if (!block.visible) {
      styles.push('display: none;');
    }

    return styles.join(' ');
  },

  /**
   * Évalue l'affichage conditionnel d'un bloc selon les données fournies
   */
  shouldDisplayBlock(block: TemplateBlock, data: Record<string, any>): boolean {
    if (!block.visible) return false;

    const condition = block.configuration?.showCondition;
    if (!condition) return true;

    try {
      // Évaluation simple de condition (ex: "average >= 10" ou "hasParent === true")
      const fn = new Function(...Object.keys(data), `return Boolean(${condition});`);
      return fn(...Object.values(data));
    } catch {
      return true; // En cas de doute, afficher
    }
  },

  /**
   * Enrobe le rendu HTML d'un bloc dans son conteneur configuré
   */
  generateBlockWrapper(block: TemplateBlock, innerHtml: string, data: Record<string, any> = {}): string {
    if (!this.shouldDisplayBlock(block, data)) {
      return '';
    }

    const cssStyle = this.generateBlockStyles(block);
    return `<div id="block-${block.id}" class="gesco-block gesco-block-${block.blockCode.toLowerCase()}" style="${cssStyle}">
      ${innerHtml}
    </div>`;
  },
};
