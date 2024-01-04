---
layout: code
---

<h2 class="font-bold text-xl">Examples</h2>

```python
def process_order(order):
  check_fraud(order.order_id, order.payment_info)
  prepare_shipment(order)
  charge_confirm = charge(order.order_id, order.payment_info)
  shipment_confirmation = ship(order)
```

```ts
async function transfer(fromAccount: string, toAccount: string, amount: number) {
	// These are activities, not regular functions.
	// Activities may run elsewhere, and their return value
	// is automatically persisted by Temporal.
	await myActivities.withdraw(fromAccount, amount);
	try {
		await myActivities.deposit(toAccount, amount);
	} catch {
		await myActivities.deposit(fromAccount, amount);
	}
}
```

```python
@activity.defn
async def compose_greeting(input: ComposeGreetingInput) -> str:
    print(f"Invoking activity, attempt number {activity.info().attempt}")
    # Fail the first 3 attempts, succeed the 4th
    if activity.info().attempt < 4:
        raise RuntimeError("Intentional failure" )
    return f"{input.greeting}, {input.name}!"


@workflow.defn
class GreetingWorkflow:
    @workflow.run
    async def run(self, name: str) -> str:
        # By default activities will retry, backing off an initial interval and
        # then using a coefficient of 2 to increase the backoff each time after
        # for an unlimited amount of time and an unlimited number of attempts.
        # We'll keep those defaults except we'll set the maximum interval to
        # just 2 seconds.
        return await workflow.execute_activity(
            compose_greeting,
            ComposeGreetingInput("Hello", name),
            start_to_close_timeout =timedelta(seconds=10),
            retry_policy=RetryPolicy(maximum_interval=timedelta(seconds=2)),
        )
```

```go
type GreetingParam struct {
	Name string `json:"name"`
}

func GreetingWorkflow(ctx workflow.Context, param *GreetingParam) (string, error) {
	ctx = workflow.WithScheduleToCloseTimeout(ctx, 30*time.Second)
	var greeting string
	err := workflow.ExecuteActivity(ctx, Greet, param).Get(ctx, &greeting)
	return greeting, err
}
```

```go
func Accept(ctx workflow.Context, input *AcceptWorkflowInput) (*AcceptWorkflowResult, error) {
	err := emailCandidate(ctx, input)
	if err != nil {
		return nil, err
	}
	submission, err := waitForSubmission(ctx)
	if err != nil {
		return nil, err
	}
	return &AcceptWorkflowResult{Submission: submission},
		nil
}
```
