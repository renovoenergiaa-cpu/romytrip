-- ==============================================================================
-- ROMY SECURITY: TRAVA DE MAIORIDADE (18+) NO BANCO DE DADOS
-- Impede o cadastro ou alteração de data de nascimento (dob) para menores de 18 anos
-- ==============================================================================

-- 1. Função que valida a idade mínima de 18 anos completos
CREATE OR REPLACE FUNCTION public.check_user_minimum_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dob IS NOT NULL THEN
    -- Verifica se a data de nascimento é no futuro ou se o usuário tem menos de 18 anos
    IF NEW.dob > (CURRENT_DATE - INTERVAL '18 years') THEN
      RAISE EXCEPTION 'Acesso proibido: O Romy é exclusivo para maiores de 18 anos. Data de nascimento inválida.'
        USING ERRCODE = '23514'; -- check_violation
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Gatilho (Trigger) antes de inserir ou atualizar a coluna dob na tabela users
DROP TRIGGER IF EXISTS trg_enforce_user_minimum_age ON public.users;

CREATE TRIGGER trg_enforce_user_minimum_age
BEFORE INSERT OR UPDATE OF dob ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.check_user_minimum_age();

-- Comentário explicativo
COMMENT ON FUNCTION public.check_user_minimum_age IS 'Bloqueia registros com idade inferior a 18 anos na tabela users.';
