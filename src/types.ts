/**
 * Type definitions for obsidian-components plugin
 */

/** A single parsed component definition from a .md file */
export interface ComponentDefinition {
    /** Component name (from frontmatter or filename) */
    name: string;
    /** Optional description */
    description: string;
    /** Default prop values */
    props: Record<string, string>;
    /** HTML template with {{prop}} placeholders */
    template: string;
    /** Scoped CSS styles */
    styles: string;
    /** Optional script content */
    script: string;
    /** Source file path (relative to vault) */
    sourcePath: string;
}

/** A parsed invocation like button(text="Hello", color="red") */
export interface ComponentInvocation {
    /** Component name */
    name: string;
    /** Props passed by the user (overrides defaults) */
    props: Record<string, string>;
}

/** Plugin settings */
export interface ComponentsPluginSettings {
    /** Folder path (relative to vault root) where component definitions live */
    componentsFolder: string;
}

export const DEFAULT_SETTINGS: ComponentsPluginSettings = {
    componentsFolder: '_components',
};
