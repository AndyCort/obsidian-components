import { ComponentDefinition, ComponentInvocation } from './types';

/**
 * Parse a component definition from a markdown file's content.
 *
 * Expected format:
 * ---
 * name: button
 * description: A customizable button
 * props:
 *   text: Click Me
 *   color: "#7c5cbf"
 * ---
 * <button>{{text}}</button>
 * <style>...</style>
 * <script>...</script>
 */
export function parseComponentDefinition(
    content: string,
    filePath: string
): ComponentDefinition | null {
    // Extract frontmatter (allow leading whitespace or BOM)
    const fmMatch = content.match(/^\s*---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
        return null;
    }

    const frontmatter = fmMatch[1] ?? '';
    const body = content.slice(fmMatch[0].length).trim();

    // Parse YAML frontmatter (simple key-value parser, supports nested props)
    const name = extractYamlValue(frontmatter, 'name')
        || fileNameFromPath(filePath);
    const description = extractYamlValue(frontmatter, 'description') || '';
    const props = extractYamlMap(frontmatter, 'props');

    // Extract <style> block
    const styleMatch = body.match(/<style>([\s\S]*?)<\/style>/i);
    const styles = styleMatch ? styleMatch[1]?.trim() ?? '' : '';

    // Extract <script> block
    const scriptMatch = body.match(/<script>([\s\S]*?)<\/script>/i);
    const script = scriptMatch ? scriptMatch[1]?.trim() ?? '' : '';

    // Template = body minus <style> and <script> blocks
    let template = body
        .replace(/<style>[\s\S]*?<\/style>/gi, '')
        .replace(/<script>[\s\S]*?<\/script>/gi, '')
        .trim();

    if (!template) {
        return null;
    }

    return {
        name,
        description,
        props,
        template,
        styles,
        script,
        sourcePath: filePath,
    };
}

/**
 * Parse an invocation line like:
 *   button(text="Hello", color="red")
 *   card(title="My Card")
 *   badge
 *
 * Returns null if the line is empty or invalid.
 */
export function parseComponentInvocation(line: string): ComponentInvocation | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Match: componentName or componentName(...)
    const match = trimmed.match(/^([a-zA-Z_][\w-]*)\s*(?:\(([\s\S]*)\))?$/);
    if (!match) return null;

    const name = match[1] ?? '';
    const argsStr = match[2] ?? '';
    const props: Record<string, string> = {};

    if (argsStr.trim()) {
        // Parse key="value" or key='value' pairs
        const argRegex = /(\w[\w-]*)\s*=\s*(?:"([^"]*?)"|'([^']*?)')/g;
        let argMatch;
        while ((argMatch = argRegex.exec(argsStr)) !== null) {
            const key = argMatch[1];
            const value = argMatch[2] ?? argMatch[3] ?? '';
            if (key) {
                props[key] = value;
            }
        }
    }

    return { name, props };
}

/**
 * Parse multiple invocation lines from a code block.
 */
export function parseCodeBlock(source: string): ComponentInvocation[] {
    return source
        .split('\n')
        .map(line => parseComponentInvocation(line))
        .filter((inv): inv is ComponentInvocation => inv !== null);
}

// ─── Simple YAML helpers (no external dependency) ──────────────────

/** Extract a simple string value from YAML, e.g. "name: button" → "button" */
function extractYamlValue(yaml: string, key: string): string {
    const regex = new RegExp(`^${key}:\\s*(.+)$`, 'm');
    const match = yaml.match(regex);
    if (!match) return '';
    let val = match[1]?.trim() ?? '';
    // Remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
    }
    return val;
}

/** Extract a map of key-value pairs under a YAML key like "props:" */
function extractYamlMap(yaml: string, key: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = yaml.split('\n');
    let inMap = false;

    for (const line of lines) {
        if (line.match(new RegExp(`^${key}:\\s*$`))) {
            inMap = true;
            continue;
        }
        if (inMap) {
            // Indented key: value
            const kvMatch = line.match(/^\s{2,}([\w-]+):\s*(.*)$/);
            if (kvMatch) {
                const k = kvMatch[1] ?? '';
                let v = kvMatch[2]?.trim() ?? '';
                if ((v.startsWith('"') && v.endsWith('"')) ||
                    (v.startsWith("'") && v.endsWith("'"))) {
                    v = v.slice(1, -1);
                }
                if (k) {
                    result[k] = v;
                }
            } else {
                // End of the map block (non-indented line)
                inMap = false;
            }
        }
    }

    return result;
}

/** Extract a base filename without extension */
function fileNameFromPath(filePath: string): string {
    const parts = filePath.split('/');
    const last = parts[parts.length - 1] ?? '';
    return last.replace(/\.md$/i, '');
}
