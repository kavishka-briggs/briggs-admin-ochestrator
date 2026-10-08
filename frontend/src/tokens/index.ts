import BriggsDefault from './BriggsDefault-orch.json';
import BriggsDark from './BriggsDark-orch.json';

const themes = {
    BriggsDefault: BriggsDefault,
    BriggsDark: BriggsDark
};

export const getTokens = (theme: 'BriggsDefault' | 'BriggsDark') => {
    return themes[theme];
};
