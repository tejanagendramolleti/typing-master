import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/ui'

/** The questions and their answers. */
const QUESTIONS = [
  {
    question: 'How is my speed calculated?',
    answer:
      'On the server, from the text you typed and the timing events recorded during the test. The browser sends what you typed and when each key was pressed; the server recomputes the score with the same engine for everybody. A client cannot report a speed it did not earn, and a network hiccup cannot change the result.',
  },
  {
    question: 'What counts as a mistake?',
    answer:
      'It depends on the exam. The SSC exams count a wrong word as a full mistake and a case, punctuation or spacing slip as a half mistake. The data entry operator test scores on accuracy alone. The rule is part of the exam profile, so the same exam always scores the same way.',
  },
  {
    question: 'Which languages can I practise in?',
    answer:
      'English, Hindi and Telugu, each with the keyboard layout the examination actually uses. For Hindi there are two: the Inscript layout, which produces ordinary Unicode and is the one we recommend, and a Kruti Dev 010 layer for candidates used to the legacy font.',
  },
  {
    question: 'What is the difference between the Inscript and Kruti Dev layouts?',
    answer:
      'Kruti Dev 010 is a font rather than a keyboard. The bytes it uses are not the characters on the screen, and the same byte can mean a consonant in one place and a vowel sign in another. The Kruti Dev layout here reads the passage to work out which is meant, and it is labelled as best-effort. The Inscript layout has no such ambiguity, so start there if you are new.',
  },
  {
    question: 'Can I go back and correct a mistake?',
    answer:
      'It depends on the exam. Some of the typing examinations do not allow the backspace key, and for those the layout disables it and records every backspace attempt. The rule is part of the exam profile, so you can see it on the exam page before you start.',
  },
  {
    question: 'What happens if I switch tabs during a test?',
    answer:
      'It is recorded, and the count is shown on your result. The test also submits itself when the time runs out, so you will not lose it by walking away.',
  },
  {
    question: 'Can I paste the passage in?',
    answer:
      'No. Pasting, dropping and the context menu are all blocked, and each attempt to do so is recorded against the test.',
  },
  {
    question: 'How many tests can I take for free?',
    answer:
      'Three a day, across all the languages. The count is kept on the server, so clearing your browser does not give you another three.',
  },
  {
    question: 'What is in the Pro plan?',
    answer:
      'The full-length mock series, unlimited practice, the detailed analytics — your speed and accuracy over time, the keys you are slow on, the words you miss most, and the hours of the day you type fastest — a drill built from your weak spots, a downloadable PDF report, and a certificate you can verify with a link when you pass a full mock.',
  },
  {
    question: 'Is the certificate an official document?',
    answer:
      'No. It is a record of what you scored on a practice test, with a unique number and a public page that confirms it. It is not a qualification, and it is not issued by any examination authority.',
  },
  {
    question: 'Do the exam rules match the real examinations?',
    answer:
      'They are close, and every profile says so. The speeds and durations are defaults chosen to match the published pattern of each examination, but the official notification always wins. Each exam page carries a note saying to check it, and the rules live in the database so they can be corrected without a code change.',
  },
  {
    question: 'Does it work on a phone?',
    answer:
      'The results and the analytics work on any device. The typing test itself is built for a keyboard, and the on-screen keyboard is there for the Indic layouts, but a phone is a poor tool for a typing examination.',
  },
]

/**
 * The frequently asked questions.
 */
export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="container-page py-12">
      <PageHeader
        eyebrow="Questions"
        title="Frequently asked questions"
        description="If the answer you need is not here, the ask is worth a question."
      />

      <div className="mx-auto max-w-3xl">
        <Card>
          <ul className="divide-y divide-ink-200 dark:divide-ink-800">
            {QUESTIONS.map((item, index) => {
              const isOpen = open === index
              return (
                <li key={item.question}>
                  <h2>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    >
                      <span className="text-sm font-semibold text-ink-900 dark:text-ink-50">
                        {item.question}
                      </span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-5 w-5 shrink-0 text-ink-400 transition-transform ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </h2>
                  {isOpen && (
                    <div className="pb-5 pr-8">
                      <p className="text-body">{item.answer}</p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-muted">
            Still not sure?{' '}
            <Link to="/exams" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
              Look at the catalogue
            </Link>{' '}
            and try a test — the free tier needs no card.
          </p>
        </div>
      </div>
    </div>
  )
}
