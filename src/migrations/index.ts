import * as migration_20261016_052329_initial from './20261016_052329_initial';
import * as migration_20261030_140639_inscricoes from './20261030_140639_inscricoes';
import * as migration_20261030_154204_remove_verificacao_email from './20261030_154204_remove_verificacao_email';
import * as migration_20261030_154227_aprovacao_cadastro from './20261030_154227_aprovacao_cadastro';
import * as migration_20261109_214014_ativacao_email from './20261109_214014_ativacao_email';
import * as migration_20261110_033447_add_editais from './20261110_033447_add_editais';
import * as migration_20261110_041139_add_arquivos_e_confirmacao from './20261110_041139_add_arquivos_e_confirmacao';

export const migrations = [
  {
    up: migration_20261016_052329_initial.up,
    down: migration_20261016_052329_initial.down,
    name: '20261016_052329_initial',
  },
  {
    up: migration_20261030_140639_inscricoes.up,
    down: migration_20261030_140639_inscricoes.down,
    name: '20261030_140639_inscricoes',
  },
  {
    up: migration_20261030_154204_remove_verificacao_email.up,
    down: migration_20261030_154204_remove_verificacao_email.down,
    name: '20261030_154204_remove_verificacao_email',
  },
  {
    up: migration_20261030_154227_aprovacao_cadastro.up,
    down: migration_20261030_154227_aprovacao_cadastro.down,
    name: '20261030_154227_aprovacao_cadastro',
  },
  {
    up: migration_20261109_214014_ativacao_email.up,
    down: migration_20261109_214014_ativacao_email.down,
    name: '20261109_214014_ativacao_email',
  },
  {
    up: migration_20261110_033447_add_editais.up,
    down: migration_20261110_033447_add_editais.down,
    name: '20261110_033447_add_editais',
  },
  {
    up: migration_20261110_041139_add_arquivos_e_confirmacao.up,
    down: migration_20261110_041139_add_arquivos_e_confirmacao.down,
    name: '20261110_041139_add_arquivos_e_confirmacao'
  },
];
