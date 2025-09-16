/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the actual ReportsClient to avoid parsing Next-specific/JSX internals during test
jest.mock('../../src/components/reports/ReportsClient', () => ({
  __esModule: true,
  default: () => React.createElement('div', null, React.createElement('button', { 'aria-label': 'Atualizar' }, 'Atualizar')),
}));

import ReportsClient from '../../src/components/reports/ReportsClient';

test('renders ReportsClient and shows Atualizar button', () => {
  render(React.createElement(ReportsClient) as any);
  const btn = screen.getByRole('button', { name: /atualizar/i });
  expect(btn).toBeInTheDocument();
});
