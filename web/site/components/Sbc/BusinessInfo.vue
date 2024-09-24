<script setup lang="ts">
interface Item {
  label: string
  value: string | null
}

const props = defineProps<{
  items: Item[]
  breakValue: 'sm' | 'md' | 'lg'
  nextARYear: string | undefined
  lastARDate: string | null | undefined
  isAuthenticated: boolean | undefined
}>()

const emit = defineEmits(['login'])


const getDueReportDates = (): Date[] => {
  const reportDates: Date[] = []
  console.log('GET DUE REPORT DATES')
  console.log('NEXT AR YEAR', props.nextARYear)

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

const filteredItems = computed(() => {
  return props.items.filter(item => item.value !== null)
})

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
    <table
      class="hidden w-fit table-auto"
      :class="breakpoint.table[breakValue]"
    >
      <tbody v-for="item in filteredItems" :key="item.label">
        <tr>
          <td class="whitespace-nowrap align-top font-semibold text-bcGovColor-darkGray">
            {{ item.label }}
          </td>
          <td class="text-wrap break-words pl-4 align-top text-bcGovColor-midGray">
            {{ item.value }}
          </td>
        </tr>
      </tbody>
    </table>
    <hr class="border-t border-gray-300 my-4">
    <h1 class="text-xl font-bold text-bcGovColor-darkGray">Annual Reports</h1>
    <p class="text-sm text-bcGovColor-midGray mb-5">Reports must be filed from oldest to newest.</p>

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
            v-if="!isAuthenticated"
            :label="$t('btn.loginBCSC')"
            :disabled="index !== 0" 
            @click="emit('login')"
          />
        </div>
      </div>
    </div>


    <!-- Mobile View -->
    <div
      v-for="item in filteredItems"
      :key="item.label"
      class="flex flex-col"
      :class="breakpoint.flex[breakValue]"
    >
      <span class="font-semibold text-bcGovColor-darkGray">
        {{ item.label }}
      </span>
      <span class="mb-4 text-bcGovColor-midGray last:mb-0">
        {{ item.value }}
      </span>
    </div>
  </div>
</template>
