"use client";

import { useEffect, useRef } from "react";

const LAYER_KEY = "treinoLayer";

/**
 * Descarta entradas de camada que sobraram. Elas ficam quando a tela some com uma
 * camada aberta sem passar pelo hook — trocar de aba na TabBar no meio das séries,
 * recarregar a página — e cada uma custaria um voltar sem efeito. Ao montar sobre uma
 * delas, volta direto para a entrada base. Chamado uma vez só, na página: com dois
 * chamadores o `go` sairia em dobro.
 */
export function useDropStaleLayers() {
  // O Strict Mode (ligado por padrão no App Router) roda o efeito duas vezes em dev; o
  // `go` sai antes de o histórico mudar, então a segunda passada voltaria em dobro.
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const depth = (window.history.state as Record<string, unknown> | null)?.[LAYER_KEY];
    if (typeof depth === "number" && depth > 0) window.history.go(-depth);
  }, []);
}

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
      // A marca diz a `useDropStaleLayers` quantas entradas desfazer se a tela sumir
      // com camadas abertas.
      window.history.pushState({ [LAYER_KEY]: pushed.current + 1 }, "");
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
