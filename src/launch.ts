import('./main').catch((error: unknown) => {
  console.error('Roam could not start.', error);
  document.getElementById('launch-splash')?.remove();
  document.getElementById('launch-error')?.removeAttribute('hidden');
});
