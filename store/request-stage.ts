import { atom } from 'jotai';

export const generatingProgressAtom = atom(0);

generatingProgressAtom.onMount = (set) => {
  return () => {
    set(0);
    console.log('generatingProgressAtom unmounted, reset to 0');
  };
};

export const resumeTextAtom = atom('');
