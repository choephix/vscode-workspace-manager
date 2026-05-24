'use client';

import { ChevronsDownIcon, XIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { useAnimatedPlaceholder } from '@/lib/hooks/useAnimatedPlaceholder';
import { SmartBarFeatures } from '@/lib/smartbar/SmartBarFeatures';
import { actions, useStore } from '@/lib/store';

// Hoisted to module scope so the reference is stable across renders;
// otherwise useAnimatedPlaceholder's effect would re-run on every keystroke.
const SMARTBAR_PLACEHOLDERS = SmartBarFeatures.flatMap(feature =>
  feature.disabled || !feature.placeholder ? [] : [feature.placeholder]
);

const SmartBar: React.FC = () => {
  const { isSomeActionRunning } = useStore();

  return (
    <div className="flex flex-col items-stretch">
      <SmartBarInputBox />

      {isSomeActionRunning ? (
        <div className="animate-fade-in-pop">
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-2"></div>
          </div>
        </div>
      ) : (
        <CommandOutput />
      )}
    </div>
  );
};

const SmartBarInputBox: React.FC = () => {
  const { isSomeActionRunning } = useStore();

  const [inputContent, setInputContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useAnimatedPlaceholder(textareaRef, SMARTBAR_PLACEHOLDERS, 'Enter ');

  useEffect(() => {
    textareaRef.current?.focus();
  }, [isSomeActionRunning]);

  const handleActionButtonClick = async () => {
    if (!inputContent) return;

    actions.setIsSomeActionRunning(true);

    try {
      await performButtonAction?.(inputContent);

      setInputContent('');
    } finally {
      actions.setIsSomeActionRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleActionButtonClick();
    }
  };

  const activeFeature = interpretSmartBarInput(inputContent);
  const { icon: Icon, action: performButtonAction, label: buttonLabel } = activeFeature;

  // Push the active feature into the store from an effect, not during render.
  useEffect(() => {
    actions.setActiveSmartBarFeature(activeFeature);
  }, [activeFeature]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto
      textarea.style.height = 'auto';

      // Set to scrollHeight or minHeight, whichever is larger
      const minHeight = 40; // Same as the minHeight in the style attribute
      const newHeight = Math.max(textarea.scrollHeight, minHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputContent]);

  const multilineMode = inputContent.includes('\n');

  return (
    <div className="flex items-start flex-grow border border-gray-600 bg-gray-700 rounded-3xl overflow-hidden">
      <div
        className={`
      flex items-center ml-3 mr-1 mt-2
      transition-all duration-200
      ${multilineMode ? ' mt-4 ml-4' : ''}
      `}
      >
        <Icon
          size="1.4em"
          className={`
            ${inputContent ? 'text-white' : 'text-gray-400'} 
            animate-pop-in transition-colors duration-500 h-full 
            flex flex-col items-center`}
          strokeWidth={1.5}
        />
      </div>
      <textarea
        ref={textareaRef}
        value={inputContent}
        onChange={e => {
          setInputContent(e.target.value);
          adjustTextareaHeight();
        }}
        onKeyDown={handleKeyDown}
        className="bg-transparent text-white py-2 pl-2 pr-4 flex-grow focus:outline-none resize-none overflow-hidden"
        disabled={isSomeActionRunning}
        rows={1}
        style={{ minHeight: '40px' }}
      />
      <button
        onClick={handleActionButtonClick}
        className={`
            px-6 py-2 text-white focus:outline-none rounded-full
            transition-all duration-200
            bg-blue-500 hover:bg-blue-600
            animate-slide-in-right
            self-end
            ${multilineMode ? 'm-2' : ''}
          `}
        disabled={isSomeActionRunning || !performButtonAction}
        hidden={!performButtonAction}
      >
        {buttonLabel}
      </button>
    </div>
  );
};

const CommandOutput = () => {
  const { lastCommandOutput } = useStore();

  if (!lastCommandOutput) return null;

  const handleClose = () => {
    actions.clearCommandOutput();
  };

  return (
    <>
      <div className="text-center line-height-0">
        <ChevronsDownIcon className="text-gray-400 w-4 h-4 inline-block" />
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-start animate-slide-in-from-up relative min-h-32">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-200 transition-colors"
        >
          <XIcon size="1em" />
        </button>
        <h2 className="px-2 text-xmd font-bold text-blue-400 mb-2">Command Output</h2>
        <pre className="px-2 overflow-x-auto text-xs border-l-2 border-gray-700">{lastCommandOutput}</pre>

        {/* <div className="flex items-center justify-center mt-4">
          <MachineStats />
        </div> */}
      </div>
    </>
  );
};

const interpretSmartBarInput = (input: string | undefined) => {
  const trimmedInput = input?.trim() ?? '';

  for (const feature of SmartBarFeatures) {
    if (feature.disabled) continue;
    if (!feature.match(trimmedInput)) continue;
    return feature;
  }

  return SmartBarFeatures[0];
};

export default SmartBar;
