const root = document.getElementById('app');
if (!root) throw new Error('Elemento #app ausente');
const heading = document.createElement('h1');
heading.textContent = 'Tabuada Quest';
const info = document.createElement('p');
info.textContent = 'Nova jornada em construção.';
root.append(heading, info);
