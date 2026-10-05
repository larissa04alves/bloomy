"use client";

import { useEffect, useRef } from "react";

/**
 * Sincroniza as camadas abertas da sessão (séries, busca, vídeo) com o histórico do
 * navegador. Sem isso elas são só estado local da rota `/treino`, e o voltar do
 * celular sai da rota inteira em vez de fechar a camada de cima.
 *
 * - `depth` subiu → empilha uma entrada por camada nova (`pushState`, que o Next 16
 *   integra ao router).
 * - voltar do celular → `popstate` → `closeTop()` fecha só a camada de cima.
 * - camada fechada pelo app (escolheu o exercício, concluiu) → desempilha as entradas
 *   que sobraram, para o próximo voltar não "gastar" um toque sem efeito.
 *
 * O botão ← de cada camada deve chamar `history.back()`: assim os dois voltar seguem o
 * mesmo caminho.
 */
export function useBackStack(depth: number, closeTop: () => void) {
  const pushed = useRef(0);
  const skipPops = useRef(0);
  const closeRef = useRef(closeTop);

  useEffect(() => {
    closeRef.current = closeTop;
  }, [closeTop]);

  useEffect(() => {
    const onPop = () => {
      if (skipPops.current > 0) {
        skipPops.current -= 1;
        return;
      }
      if (pushed.current === 0) return;
      pushed.current -= 1;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    while (pushed.current < depth) {
      window.history.pushState(null, "");
      pushed.current += 1;
    }
    if (pushed.current > depth) {
      const extra = pushed.current - depth;
      pushed.current = depth;
      // `go(-n)` dispara um único popstate, que não deve fechar mais nada
      skipPops.current += 1;
      window.history.go(-extra);
    }
  }, [depth]);
}
