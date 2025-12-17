// Simple Pub/Sub State Store

const initialState = {
    currentPath: '',
    files: [],
    parentPath: '',
    theme: localStorage.getItem('theme') || 'light',
    historyLogs: []
};

let state = { ...initialState };
const listeners = new Set();

export const Store = {
    get() { return state; },

    subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    setState(newState) {
        state = { ...state, ...newState };
        if (newState.theme) {
            document.documeentElement?.setAttribute('data-theme', newState.theme);
            localStorage.setItem('theme', newState.theme);
        }
        listeners.forEach(l => l(state));
        console.log('State updated:', state); // Debug
    },

    // Actions
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.setState({ theme });
    }
};

// Initialize theme immediately
if (state.theme) {
    document.documentElement.setAttribute('data-theme', state.theme);
}
