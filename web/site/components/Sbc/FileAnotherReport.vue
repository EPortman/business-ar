<script setup lang="ts">

const props = defineProps<{
  breakValue: 'sm' | 'md' | 'lg'
  nextARYear: string | null
  lastARDate: string | null
}>()

const emit = defineEmits(['login'])


const getDueReportDates = (): Date[] => {
  const reportDates: Date[] = []

  if (!props.lastARDate || !props.nextARYear) {
    return reportDates
  }

  const currYear = new Date().getFullYear()
  const nextArYear = parseInt(props.nextARYear, 10)
  const lastArDateObj = new Date(props.lastARDate)

  const dueMonth = lastArDateObj.getUTCMonth()
  const dueDay = lastArDateObj.getUTCDate()

  for (let year = nextArYear; year <= currYear; year++) {
    const reportDueDate = new Date(year, dueMonth, dueDay)
    reportDates.push(reportDueDate)
  }
  return reportDates
}

const breakpoint: Record<string, { [key: string]: string }> = {
  table: {
    sm: 'sm:block',
    md: 'md:block',
    lg: 'lg:block'
  },
  flex: {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden'
  }
}
</script>
<template class="w-full">
  <div class="text-left w-[800px]">
    <!-- Desktop/Tablet View -->
    <h1 class="text-2xl font-bold mb-5">Log in to BC Registries</h1>


    <!-- Iterate over the getDueReportDates -->
    <div v-for="(date, index) in getDueReportDates()" :key="index" class="mb-4">
      <div class="border border-red-500 bg-red-100 p-4 rounded-sm flex items-center justify-between">
        <!-- First column: Red Alert Icon -->
        <div class="flex items-center">
          <UAlert
            class="text-red-500 shrink-0 w-7 h-7 !p-0 !bg-transparent !ring-0 !rounded-none mr-2 !pt-1"
            icon="i-mdi-alert"
          />
        </div>

        <!-- Second column: Report Title and Date -->
        <div class="flex-1">
          <h2 class="font-bold text-lg text-bcGovColor-darkGray">
            {{ date.getFullYear() }} BC Annual Report
          </h2>
          <p class="text-bcGovColor-midGray">
            Due {{ date.toLocaleString('default', { month: 'long' }) }} {{ date.getDate() }}, {{ date.getFullYear() }}
          </p>
        </div>

        <!-- Third column: Button -->
        <div class="flex items-center">
          <UButton
            :label="$t('btn.loginBCSC')"
            :disabled="index !== 0" 
            @click="emit('login')"
          />
        </div>
      </div>
    </div>
  </div>
</template>
