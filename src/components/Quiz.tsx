import { useState } from 'react';
import type { Question } from '../data/types';

interface Props {
  questions: Question[];
  onDone: (score: number) => void;
}

export function Quiz({ questions, onDone }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = answers.every((a) => a != null);
  const correct = answers.filter((a, i) => a === questions[i].answer).length;

  return (
    <div className="quiz">
      <h3>Comprehension check</h3>
      <p className="muted">Answer from memory. Speed only counts if the key information stuck.</p>
      {questions.map((q, qi) => (
        <fieldset key={qi} className="question">
          <legend>{qi + 1}. {q.prompt}</legend>
          {q.options.map((opt, oi) => {
            const chosen = answers[qi] === oi;
            let cls = 'option';
            if (submitted && oi === q.answer) cls += ' correct';
            else if (submitted && chosen) cls += ' wrong';
            else if (chosen) cls += ' chosen';
            return (
              <label key={oi} className={cls}>
                <input
                  type="radio"
                  name={`q${qi}`}
                  checked={chosen}
                  disabled={submitted}
                  onChange={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                />
                {opt}
              </label>
            );
          })}
        </fieldset>
      ))}
      {!submitted ? (
        <button className="btn primary" disabled={!allAnswered} onClick={() => setSubmitted(true)}>
          Check answers
        </button>
      ) : (
        <div className="quiz-result">
          <strong>{correct} / {questions.length} correct</strong>
          <button className="btn primary" onClick={() => onDone(correct / questions.length)}>See results</button>
        </div>
      )}
    </div>
  );
}
