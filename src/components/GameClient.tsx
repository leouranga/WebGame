'use client';

import { useEffect, useRef } from 'react';
import { GAME_HEIGHT, GAME_WIDTH } from '@/game/constants';
import { createGameState, handleActionKey, handlePointerClick, updateGameState } from '@/game/engine';
import { renderGame } from '@/game/render';
import type { InputState } from '@/game/types';

const createInput = (): InputState => ({
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  mouseDown: false,
  mouse: { x: GAME_WIDTH * 0.7, y: GAME_HEIGHT * 0.45 },
});

const pointInRect = (point: { x: number; y: number }, rect: { x: number; y: number; w: number; h: number } | null) => Boolean(
  rect
  && point.x >= rect.x
  && point.x <= rect.x + rect.w
  && point.y >= rect.y
  && point.y <= rect.y + rect.h,
);

const isPointerOnInteractiveUi = (state: ReturnType<typeof createGameState>) => {
  const { pointer, ui } = state;
  if (ui.mageCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.upgradeCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.shopCards.some((entry) => pointInRect(pointer, entry.rect))) return true;
  if (ui.hudUpgradeIcons.some((entry) => pointInRect(pointer, entry.rect))) return true;
  return [ui.startRect, ui.shopRect, ui.nextWaveRect, ui.restartRect, ui.menuRect, ui.rerollRect].some((rect) => pointInRect(pointer, rect));
};

export function GameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const state = createGameState();
    const input = createInput();
    let lastTime = performance.now();
    let frame = 0;

    const updateMouse = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      input.mouse = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();

      if (key === 'a' || key === 'arrowleft') input.left = true;
      if (key === 'd' || key === 'arrowright') input.right = true;
      if (key === 'w' || key === ' ' || key === 'arrowup') {
        if (!input.jumpHeld) input.jumpPressed = true;
        input.jumpHeld = true;
      }

      handleActionKey(state, event.key);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') input.left = false;
      if (key === 'd' || key === 'arrowright') input.right = false;
      if (key === 'w' || key === ' ' || key === 'arrowup') input.jumpHeld = false;
    };

    const onMouseMove = (event: MouseEvent) => updateMouse(event);

    const onMouseDown = (event: MouseEvent) => {
      updateMouse(event);
      input.mouseDown = true;
    };

    const onMouseUp = () => {
      input.mouseDown = false;
    };

    const onClick = (event: MouseEvent) => {
      updateMouse(event);
      handlePointerClick(state, input.mouse);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('click', onClick);

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.033);
      lastTime = time;
      updateGameState(state, input, dt);
      context.clearRect(0, 0, canvas.width, canvas.height);
      renderGame(context, state);
      canvas.style.cursor = isPointerOnInteractiveUi(state) ? 'pointer' : 'default';
      input.jumpPressed = false;
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = 'default';
    };
  }, []);

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden p-2 sm:p-3">
      <div className="flex h-[98vh] w-[98vw] items-center justify-center rounded-[30px] border border-white/10 bg-black/28 p-2 shadow-[0_0_80px_rgba(76,29,149,0.32)] backdrop-blur">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="rounded-[24px] border border-indigo-300/15 bg-slate-950"
          style={{
            width: 'min(96vw, calc(96vh * 16 / 9))',
            height: 'min(96vh, calc(96vw * 9 / 16))',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        />
      </div>
    </main>
  );
}
