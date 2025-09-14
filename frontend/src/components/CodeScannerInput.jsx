import React, { useRef, useEffect } from "react";

export default function CodeScannerInput({ addByCode, loading, total, scanningEnabled }) {
    const hiddenInputRef = useRef(null);
    const bufferRef = useRef("");
  
    useEffect(() => {
        if (!scanningEnabled) return; // disable scanner focus
      
        const focusInput = () => {
          const activeTag = document.activeElement.tagName;
          // if user is typing/selecting in an input/textarea/select → don’t steal focus
          if (["INPUT", "TEXTAREA", "SELECT"].includes(activeTag)) return;
          hiddenInputRef.current?.focus();
        };
      
        focusInput();
        window.addEventListener("click", focusInput);
        window.addEventListener("keydown", focusInput);
      
        return () => {
          window.removeEventListener("click", focusInput);
          window.removeEventListener("keydown", focusInput);
        };
      }, [scanningEnabled]);
  
    const handleKeyDown = (e) => {
      if (!scanningEnabled) return; // do nothing if disabled
      if (e.key === "Enter") {
        if (bufferRef.current.trim()) {
          addByCode(bufferRef.current.trim());
          bufferRef.current = "";
        }
        e.preventDefault();
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      } else if (e.key === "Backspace") {
        bufferRef.current = bufferRef.current.slice(0, -1);
      }
    };
  
    return (
      <>
        <input
          ref={hiddenInputRef}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", height: 0, width: 0 }}
          onKeyDown={handleKeyDown}
        />
        <div className="row">
          
          {loading && <span> Processing...</span>}
        </div>
      </>
    );
  }
  