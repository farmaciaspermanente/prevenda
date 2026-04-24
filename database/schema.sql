-- Habilita extensão pgcrypto para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Limpa tabelas caso existam (cuidado em produção, isto apagará tudo!)
DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS permissoes_menu CASCADE;
DROP TABLE IF EXISTS produto_filial CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS filiais CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Criação das Tabelas

-- Filial
CREATE TABLE filiais (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Profiles (Tabela de usuários estendida, vinculada ao auth.users do Supabase)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'vendedor', 'cadastro')) DEFAULT 'vendedor',
    filial_id TEXT REFERENCES filiais(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Produto
CREATE TABLE produtos (
    id TEXT PRIMARY KEY,
    ean TEXT UNIQUE,
    descricao TEXT NOT NULL,
    principio_ativo TEXT,
    subgrupo TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Produto Filial
CREATE TABLE produto_filial (
    id_filial TEXT REFERENCES filiais(id) ON DELETE CASCADE,
    id_produto TEXT REFERENCES produtos(id) ON DELETE CASCADE,
    preco_venda NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    quantidade INTEGER NOT NULL DEFAULT 0,
    prevencido_disponivel INTEGER DEFAULT 0,
    desconto_prevencido NUMERIC(15, 2) DEFAULT 0.00,
    desconto_padrao NUMERIC(15, 2) DEFAULT 0.00,
    PRIMARY KEY (id_filial, id_produto)
);

-- 1.1 Views
CREATE OR REPLACE VIEW v_produto_filial AS
SELECT 
    pf.id_filial,
    pf.id_produto,
    pf.preco_venda,
    pf.quantidade,
    pf.prevencido_disponivel,
    pf.desconto_prevencido,
    pf.desconto_padrao,
    p.descricao AS produto_descricao,
    p.ean AS produto_ean,
    p.principio_ativo AS produto_principio_ativo,
    p.subgrupo AS produto_subgrupo,
    f.nome AS filial_nome
FROM produto_filial pf
JOIN produtos p ON pf.id_produto = p.id
JOIN filiais f ON pf.id_filial = f.id;

-- Permissoes Menu
CREATE TABLE permissoes_menu (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    menu TEXT NOT NULL,
    PRIMARY KEY (user_id, menu)
);

-- Pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero SERIAL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    user_id UUID REFERENCES profiles(id),
    filial_id TEXT REFERENCES filiais(id),
    status TEXT CHECK (status IN ('Aberto', 'Finalizado', 'Cancelado')) DEFAULT 'Aberto',
    observacao TEXT,
    total NUMERIC(15, 2) DEFAULT 0.00
);

-- Itens Pedido
CREATE TABLE itens_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id TEXT REFERENCES produtos(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,
    origem_sugestao TEXT DEFAULT 'Manual'
);

-- 2. Gatilhos / Funções para controle de Estoque

CREATE OR REPLACE FUNCTION atualiza_estoque_pedido()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- Se o pedido for Finalizado e estava Aberto
    IF NEW.status = 'Finalizado' AND OLD.status = 'Aberto' THEN
        FOR item IN SELECT produto_id, quantidade, origem_sugestao FROM itens_pedido WHERE pedido_id = NEW.id LOOP
            -- Atualiza estoque geral
            UPDATE produto_filial 
            SET quantidade = quantidade - item.quantidade
            WHERE id_produto = item.produto_id AND id_filial = NEW.filial_id;

            -- Se foi venda de produto prevencido, abate também do saldo de prevencidos
            IF item.origem_sugestao = 'Prevencido' THEN
                UPDATE produto_filial 
                SET prevencido_disponivel = prevencido_disponivel - item.quantidade
                WHERE id_produto = item.produto_id AND id_filial = NEW.filial_id;
            END IF;
        END LOOP;
    END IF;

    -- Se o pedido for Cancelado e estava Finalizado, devolve o estoque
    IF NEW.status = 'Cancelado' AND OLD.status = 'Finalizado' THEN
        FOR item IN SELECT produto_id, quantidade, origem_sugestao FROM itens_pedido WHERE pedido_id = NEW.id LOOP
            -- Devolve estoque geral
            UPDATE produto_filial 
            SET quantidade = quantidade + item.quantidade
            WHERE id_produto = item.produto_id AND id_filial = NEW.filial_id;

            -- Se foi venda de produto prevencido, devolve também ao saldo de prevencidos
            IF item.origem_sugestao = 'Prevencido' THEN
                UPDATE produto_filial 
                SET prevencido_disponivel = prevencido_disponivel + item.quantidade
                WHERE id_produto = item.produto_id AND id_filial = NEW.filial_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualiza_estoque
AFTER UPDATE OF status ON pedidos
FOR EACH ROW
EXECUTE FUNCTION atualiza_estoque_pedido();

-- Automatiza a criação de profile quando um usuário é criado no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)), 'vendedor');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Habilitar leitura de usuários autenticados para as tabelas iniciais.
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_filial ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissoes_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;

-- Politicas básicas para a fase inicial (permite tudo para autenticados)
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON filiais FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON produtos FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON produto_filial FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON permissoes_menu FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON pedidos FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir acesso total a usuarios autenticados" ON itens_pedido FOR ALL TO authenticated USING (true);
