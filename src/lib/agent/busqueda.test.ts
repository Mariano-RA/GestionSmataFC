import { describe, it, expect } from 'vitest';
import { buscarJugadores, buscarPorNombre, normalizarTexto } from './busqueda';

const equipos = [{ name: 'Smata +30' }, { name: 'Smata Libre' }, { name: 'Smata Femenino' }];

describe('normalizarTexto', () => {
  it('saca tildes, mayúsculas y espacios de más', () => {
    expect(normalizarTexto('  José   MARÍA ')).toBe('jose maria');
  });
});

describe('buscarPorNombre', () => {
  it('encuentra el equipo por una palabra', () => {
    expect(buscarPorNombre(equipos, 'libre')).toEqual([{ name: 'Smata Libre' }]);
    expect(buscarPorNombre(equipos, '+30')).toEqual([{ name: 'Smata +30' }]);
    expect(buscarPorNombre(equipos, 'femenino')).toEqual([{ name: 'Smata Femenino' }]);
  });

  it('con una palabra común devuelve todos (ambiguo)', () => {
    expect(buscarPorNombre(equipos, 'smata')).toHaveLength(3);
  });

  it('el nombre idéntico gana sobre los que solo lo contienen', () => {
    const lista = [{ name: 'Juan' }, { name: 'Juan Pablo' }];
    expect(buscarPorNombre(lista, 'juan')).toEqual([{ name: 'Juan' }]);
  });

  it('acepta las palabras en cualquier orden', () => {
    const lista = [{ name: 'Perez Juan' }, { name: 'Lopez Ana' }];
    expect(buscarPorNombre(lista, 'juan perez')).toEqual([{ name: 'Perez Juan' }]);
  });

  it('sin coincidencia o con consulta vacía devuelve vacío', () => {
    expect(buscarPorNombre(equipos, 'master')).toEqual([]);
    expect(buscarPorNombre(equipos, '   ')).toEqual([]);
  });
});

describe('buscarJugadores', () => {
  it('prefiere a los habilitados', () => {
    const lista = [
      { name: 'Martin Gomez', active: false },
      { name: 'Martin Diaz', active: true },
    ];
    expect(buscarJugadores(lista, 'martin')).toEqual([{ name: 'Martin Diaz', active: true }]);
  });

  it('si solo hay deshabilitados, los devuelve igual', () => {
    const lista = [{ name: 'Martin Gomez', active: false }];
    expect(buscarJugadores(lista, 'martin')).toHaveLength(1);
  });

  it('sin tildes: "jose" encuentra "José"', () => {
    expect(buscarJugadores([{ name: 'José Ruiz', active: true }], 'jose')).toHaveLength(1);
  });
});
