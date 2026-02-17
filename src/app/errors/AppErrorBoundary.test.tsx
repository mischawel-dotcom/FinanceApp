import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { AppErrorBoundary } from './AppErrorBoundary';

function Boom() {
  throw new Error('boom');
}

describe('AppErrorBoundary', () => {
  it('zeigt Fehlerkarte bei Fehler im Kind', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>
    );
    expect(screen.getByText(/Etwas ist schiefgelaufen/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /neu laden/i })).toBeInTheDocument();
  });
});
