'use client'
import { useState } from 'react'

import Modal from '../components/modal'
import CostsCalculator from '../costs_calculator/page'

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="p-6">
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded"
      >
        פתח מחשבון עלויות
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <CostsCalculator />
      </Modal>
    </div>
  )
}
