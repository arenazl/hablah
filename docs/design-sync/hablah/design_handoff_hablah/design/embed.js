/* embed.js — activa el modo embebido solo cuando el integrador lo pide con ?embed=1 */
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');
