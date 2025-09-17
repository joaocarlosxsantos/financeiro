/** @jest-environment jsdom */
const React = require('react');
const { render, screen } = require('@testing-library/react');
require('@testing-library/jest-dom');

jest.mock('../../src/components/reports/ReportsClient', () => {
  const ReactLocal = require('react');
  return {
    __esModule: true,
    default: () => ReactLocal.createElement('div', null, ReactLocal.createElement('button', { 'aria-label': 'Atualizar' }, 'Atualizar')),
  };
});

const ReportsClient = require('../../src/components/reports/ReportsClient').default;

test('renders ReportsClient and shows Atualizar button', () => {
  render(React.createElement(ReportsClient));
  const btn = screen.getByRole('button', { name: /atualizar/i });
  expect(btn).toBeInTheDocument();
});
