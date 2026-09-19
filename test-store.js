const zustand = require('zustand/vanilla');

const store = zustand.createStore((set) => ({
  syncState: null,
  currentUrl: null,
  setSyncState: (syncState) => set((state) => ({ 
    syncState,
    currentUrl: syncState.currentUrl !== undefined ? syncState.currentUrl : state.currentUrl 
  })),
  setCurrentUrl: (currentUrl) => set((state) => ({ 
    currentUrl,
    syncState: state.syncState ? { ...state.syncState, currentUrl } : null
  })),
}));

store.getState().setSyncState({ currentUrl: 'Video 1', isPlaying: false });
console.log("After initial join:", store.getState());

store.getState().setCurrentUrl('Video 2');
console.log("After url change:", store.getState());

store.getState().setSyncState({ ...store.getState().syncState, isPlaying: true });
console.log("After play:", store.getState());
