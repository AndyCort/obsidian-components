import { ComponentDefinition } from './types';

export interface RenderOptions {
    enableScripts: boolean;
    displayMode: 'inline' | 'block';
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
    enableScripts: true,
    displayMode: 'inline',
};

/**
 * Render a component into a container element.
 *
 * 1. Merge default props with user-supplied props
 * 2. Replace {{prop}} placeholders in the template
 * 3. Inject scoped CSS
 * 4. Set innerHTML and execute any script
 */
export function renderComponent(
    container: HTMLElement,
    definition: ComponentDefinition,
    userProps: Record<string, string>,
    options?: Partial<RenderOptions>
): void {
    const opts = { ...DEFAULT_RENDER_OPTIONS, ...options };

    // Generate a unique scope ID for CSS isolation
    const scopeId = `oc-${definition.name}-${randomId()}`;
    container.classList.add('obsidian-component');
    if (opts.displayMode === 'block') {
        container.classList.add('oc-block');
    }
    container.setAttribute('data-component', definition.name);
    container.setAttribute('data-scope', scopeId);

    // Merge props: defaults ← user overrides
    const mergedProps: Record<string, string> = {
        ...definition.props,
        ...userProps,
    };

    // Replace template placeholders {{key}}
    let html = definition.template;
    for (const [key, value] of Object.entries(mergedProps)) {
        html = html.replace(
            new RegExp(`\\{\\{\\s*${escapeRegex(key)}\\s*\\}\\}`, 'g'),
            escapeHtml(value)
        );
    }

    // Remove any remaining unresolved placeholders
    html = html.replace(/\{\{\s*\w[\w-]*\s*\}\}/g, '');

    // Build scoped CSS by prefixing selectors with scope attribute
    let scopedCss = '';
    if (definition.styles) {
        scopedCss = scopeStyles(definition.styles, `[data-scope="${scopeId}"]`);
    }

    // Create the inner DOM
    const wrapper = document.createElement('div');
    wrapper.className = 'oc-inner';

    // Inject style tag
    if (scopedCss) {
        const styleEl = document.createElement('style');
        styleEl.textContent = scopedCss;
        container.appendChild(styleEl);
    }

    // Inject HTML
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    // Execute script if present and allowed
    if (definition.script && opts.enableScripts) {
        try {
            const scriptFn = new Function('el', 'props', definition.script);
            scriptFn(wrapper, mergedProps);
        } catch (e) {
            console.error(`[obsidian-components] Error executing script for "${definition.name}":`, e);
        }
    }
}

/**
 * Render an error message into the container.
 */
export function renderError(container: HTMLElement, message: string): void {
    container.classList.add('obsidian-component', 'oc-error');
    container.innerHTML = `
		<div class="oc-error-content">
			<span class="oc-error-icon">⚠️</span>
			<span class="oc-error-text">${escapeHtml(message)}</span>
		</div>
	`;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Scope CSS selectors by prepending a scope prefix */
function scopeStyles(css: string, scopePrefix: string): string {
    // Split into rule blocks and prefix each selector
    // This is a simplified approach that handles common cases
    return css.replace(
        /(^|\})\s*([^{}@]+?)\s*\{/g,
        (match, before: string, selectors: string) => {
            const scoped = selectors
                .split(',')
                .map((sel: string) => {
                    sel = sel.trim();
                    if (!sel) return sel;
                    // Don't scope keyframe names or :root
                    if (sel.startsWith(':root') || sel.startsWith('from') ||
                        sel.startsWith('to') || /^\d+%$/.test(sel)) {
                        return sel;
                    }
                    return `${scopePrefix} ${sel}`;
                })
                .join(', ');
            return `${before} ${scoped} {`;
        }
    );
}

function randomId(): string {
    return Math.random().toString(36).substring(2, 8);
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
