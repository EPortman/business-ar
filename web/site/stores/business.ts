export const useBusinessStore = defineStore('bar-sbc-business-store', () => {
  // config imports
  const arStore = useAnnualReportStore()
  const accountStore = useAccountStore()
  const alertStore = useAlertStore()

  // store values
  const loading = ref<boolean>(true)
  const currentBusiness = ref<BusinessFull>({} as BusinessFull)
  const fullDetails = ref<Business>({} as Business)
  const businessNano = ref<BusinessNano>({} as BusinessNano)
  const nextArDate = ref<string>('')
  const futureArDate = ref<string>('')
  const payStatus = ref<string | null>(null)
  const completedARYears = ref<Array<number | null>>([]);

  // get basic business info by nano id
  async function getBusinessByNanoId (id: string): Promise<void> {
    try {
      const response = await useBarApi<BusinessNano>(`/business/token/${id}`)
      console.log('getBusinessByNanoId')
      console.log(response)
      console.log('This needs to check both colin and business AR')
      if (response) {
        businessNano.value = response
        businessNano.value.nanoID = id
      }
    } catch (e) {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.INVALID_TOKEN
      })
      throw e
    }
  }

  // TODO: investigate business details in network tab, specifically being able to see business details when there is an in progress filing and the user does not own the account associated with that filing
  async function getFullBusinessDetails (): Promise<void> {
    try {
      const response = await useBarApi<Business>(`/business/${businessNano.value.identifier}`, {}, 'token')
      console.log('Full Business Details:', JSON.stringify(response, null, 2));
      if (response) {
        fullDetails.value = response
      }
    } catch (e) {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.BUSINESS_DETAILS
      })
      throw e
    }
  }

  function assignBusinessStoreValues (bus: BusinessFull) {
    currentBusiness.value = bus

    // throw error if business not in ACT corpState
    if (bus.corpState !== 'ACT') {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.INACTIVE_CORP_STATE
      })
      throw new Error(`${bus.legalName || 'This business'} is not in an active state.`)
    }

    // throw error if business has future effective filings
    if (bus.hasFutureEffectiveFilings) {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.FUTURE_EFFECTIVE_FILINGS
      })
      throw new Error(`${bus.legalName || 'This business'} has future effective filings.`)
    }

    // throw an error if the nextArYear is invalid
    if (!bus.nextARYear || bus.nextARYear === -1) {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.INVALID_NEXT_AR_YEAR
      })
      throw new Error(`${bus.legalName || 'This business'} is not eligible to file an Annual Report`)
    }

    // if no lastArDate, it means this is the companies first AR, so need to use founding date instead
    if (!bus.lastArDate) {
      console.log('NO LAST AR DATE')
      console.log('USING FOUNDING DATE INSTEAD', bus.foundingDate)
      nextArDate.value = addOneYear(bus.foundingDate)
      futureArDate.value = addOneYear(nextArDate.value)
    } else {
      console.log('LAST AR DATE FOUND')
      console.log('USING LAST AR DATE ', bus.lastArDate)
      nextArDate.value = addOneYear(bus.lastArDate!)
      futureArDate.value = addOneYear(nextArDate.value)
    }

    // throw error if next ar date is in the future
    if (new Date(nextArDate.value) > new Date()) {
      alertStore.addAlert({
        severity: 'error',
        category: AlertCategory.FUTURE_FILING
      })
      throw new Error(`Annual Report not due until ${nextArDate.value}`)
    }
  }

  // ping sbc pay to see if payment went through and return pay status details
  async function updatePaymentStatusForBusiness (filingId: string | number): Promise<void> {
    const response = await useBarApi<ArFiling>(
      `/business/${businessNano.value.identifier}/filings/${filingId}/payment`,
      { method: 'PUT' },
      'token',
      'Error updating business payment status.'
    )

    if (response) {
      payStatus.value = response.filing.header.status
      arStore.arFiling = response
      nextArDate.value = futureArDate.value
      futureArDate.value = addOneYear(futureArDate.value)
    }
  }

  async function getBusinessTask (): Promise<{ task: string | null, taskValue: BusinessTodoTask | BusinessFilingTask | null }> {
    try {
      console.log('Starting getBusinessTask...');
  
      // Make the API call and log the response
      const response = await useBarApi<BusinessTask>(
        `/business/${businessNano.value.identifier}/tasks`,
        {},
        'token',
        'Error retrieving business tasks.'
      )
      // response.tasks[0].task.todo.business.hasFutureEffectiveFilings = false;
      // console.log('RESPONSE')
      // console.log(response)
      // response.tasks[0].task.todo.business.hasFutureEffectiveFilings = false;
      // console.log('Response from /tasks endpoint:');
      // console.log(JSON.stringify(response, null, 2));
  
      // Fetching full business details and log the full details
      await getFullBusinessDetails();
      console.log('Full business details fetched:');
      fullDetails.value.business.hasFutureEffectiveFilings = false
      console.log(JSON.stringify(fullDetails.value.business, null, 2));
  
      // Assign business store values
      assignBusinessStoreValues(fullDetails.value.business);
      console.log('Business store values assigned.');
  
      // Handle case where no tasks are available
      if (response.tasks.length === 0) {
        console.log('No tasks available, business filings are up to date.');
        return { task: null, taskValue: null }
      }
  
      // Log the first task value and its name
      const taskValue = response.tasks[0].task;
      const taskName = Object.getOwnPropertyNames(taskValue)[0];
      console.log('First task value:', taskValue);
      console.log('Task name:', taskName);
  
      // Handle 'filing' tasks and log relevant details
      if ('filing' in taskValue) {
        console.log('Filing task detected:', taskValue.filing);
  
        await accountStore.getAndSetAccount(taskValue.filing.header.paymentAccount);
        console.log('Account set for payment account:', taskValue.filing.header.paymentAccount);
  
        // Check account ownership and throw error if necessary
        if (!accountStore.userAccounts.some(account => account.id === parseInt(taskValue.filing.header.paymentAccount))) {
          console.log('Access Denied: User does not own the account for the in-progress filing.');
          alertStore.addAlert({
            severity: 'error',
            category: AlertCategory.ACCOUNT_ACCESS
          });
          throw new Error('Access Denied: Your account does not have permission to complete this task.');
        }
  
        // Log and assign filing details to arStore
        arStore.arFiling = {
          filing: {
            header: taskValue.filing.header,
            annualReport: taskValue.filing.annualReport,
            documents: taskValue.filing.documents
          }
        };
        console.log('Filing details assigned to arStore:', arStore.arFiling);
  
        // Log payment status
        payStatus.value = taskValue.filing.header.status;
        console.log('Payment status:', payStatus.value);
      }
  
      // Return the task name and task value
      console.log('Returning task:', { task: taskName, taskValue });
      return { task: taskName, taskValue };
      
    } catch (e) {
      // Log the error before throwing it again
      console.error('Error occurred in getBusinessTask:', e);
  
      // Add a general error alert if it's not an access denial issue
      if (!(e instanceof Error && e.message.includes('Access Denied'))) {
        alertStore.addAlert({
          severity: 'error',
          category: AlertCategory.BUSINESS_DETAILS
        });
        console.error('General error alert triggered.');
      }
  
      throw e;
    }
  }
  

  function $reset () {
    console.log("RESET CALED")
    loading.value = true
    currentBusiness.value = {} as BusinessFull
    businessNano.value = {} as BusinessNano
    nextArDate.value = ''
    payStatus.value = null
    fullDetails.value = {} as Business
  }

  return {
    getBusinessByNanoId,
    updatePaymentStatusForBusiness,
    getBusinessTask,
    assignBusinessStoreValues,
    getFullBusinessDetails,
    $reset,
    loading,
    currentBusiness,
    businessNano,
    nextArDate,
    payStatus,
    fullDetails,
    completedARYears
  }
},
{ persist: true } // persist store values in session storage
)
