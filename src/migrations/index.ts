import * as migration_20261016_052329_initial from './20261016_052329_initial';
import * as migration_20261030_140639_inscricoes from './20261030_140639_inscricoes';
import * as migration_20261030_154204_remove_verificacao_email from './20261030_154204_remove_verificacao_email';
import * as migration_20261030_154227_aprovacao_cadastro from './20261030_154227_aprovacao_cadastro';
import * as migration_20261109_214014_ativacao_email from './20261109_214014_ativacao_email';
import * as migration_20261110_033447_add_editais from './20261110_033447_add_editais';
import * as migration_20261110_041139_add_arquivos_e_confirmacao from './20261110_041139_add_arquivos_e_confirmacao';
import * as migration_20261110_111621_add_grupos_opcoes from './20261110_111621_add_grupos_opcoes';
import * as migration_20261120_214500_categoria_peso_inscricao from './20261120_214500_categoria_peso_inscricao';
import * as migration_20261120_223000_sexo_atleta from './20261120_223000_sexo_atleta';
import * as migration_20261124_120000_texto_comprovante_area from './20261124_120000_texto_comprovante_area';
import * as migration_20261124_145650_add_curtidas from './20261124_145650_add_curtidas';
import * as migration_20261124_181157_contar_vagas_por from './20261124_181157_contar_vagas_por';

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
    name: '20261110_041139_add_arquivos_e_confirmacao',
  },
  {
    up: migration_20261110_111621_add_grupos_opcoes.up,
    down: migration_20261110_111621_add_grupos_opcoes.down,
    name: '20261110_111621_add_grupos_opcoes',
  },
  {
    up: migration_20261120_214500_categoria_peso_inscricao.up,
    down: migration_20261120_214500_categoria_peso_inscricao.down,
    name: '20261120_214500_categoria_peso_inscricao',
  },
  {
    up: migration_20261120_223000_sexo_atleta.up,
    down: migration_20261120_223000_sexo_atleta.down,
    name: '20261120_223000_sexo_atleta',
  },
  {
    up: migration_20261124_120000_texto_comprovante_area.up,
    down: migration_20261124_120000_texto_comprovante_area.down,
    name: '20261124_120000_texto_comprovante_area',
  },
  {
    up: migration_20261124_145650_add_curtidas.up,
    down: migration_20261124_145650_add_curtidas.down,
    name: '20261124_145650_add_curtidas',
  },
  {
    up: migration_20261124_181157_contar_vagas_por.up,
    down: migration_20261124_181157_contar_vagas_por.down,
    name: '20261124_181157_contar_vagas_por'
  },
];
