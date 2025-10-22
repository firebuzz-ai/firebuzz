/**
 * System Colors Singleton
 *
 * Manages the current theme's system colors for use in color selection.
 * This is updated whenever the theme changes in design mode.
 */

export interface SystemColor {
	name: string;
	displayName: string;
	hexValue: string;
	hslValue: string;
	category: string;
	description: string;
}

class SystemColorsManager {
	private colors: SystemColor[] = [];

	setColors(colors: SystemColor[]) {
		this.colors = colors;
	}

	getColors(): SystemColor[] {
		return this.colors;
	}

	getColorByName(name: string): SystemColor | undefined {
		return this.colors.find((c) => c.name === name);
	}

	clear() {
		this.colors = [];
	}
}

// Export singleton instance
export const systemColorsManager = new SystemColorsManager();
