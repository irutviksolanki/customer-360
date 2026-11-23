"""Insert clearly fictional demo records without replacing existing or edited data.

Run from the project root: python -m backend.seed_demo
If multiple accounts exist, pass --owner-id <existing-user-uuid>.
"""
import argparse
from datetime import datetime, timedelta
from uuid import UUID, uuid5
from zoneinfo import ZoneInfo

from psycopg.types.json import Jsonb
from backend.main import connection

NAMESPACE = UUID('41dad43d-03df-4af5-b169-111277bc721b')
TAG = 'gcc360-demo-v1'


def record_id(owner: str, key: str) -> str:
    return str(uuid5(NAMESPACE, f'{TAG}:{owner}:{key}'))


def seed(owner_id: str | None = None) -> None:
    today = datetime.now(ZoneInfo('Asia/Kolkata')).date()
    # All names and business feedback below are fictional testing examples.
    accounts = [
        ('Demo · Horizon Textiles', 'Home textiles', 'Mumbai', 'Maya Kapoor', 'Chief Financial Officer', 'Finance',
         [('Concerned', 'Concern', 'Turnaround time', 'Month-end reports arrive too late for our planning meetings.'),
          ('Neutral', 'Suggestion', 'Process improvement', 'Please share a single reporting calendar for all finance deliverables.'),
          ('Positive', 'Appreciation', 'Service delivery', 'The revised reporting pack is accurate and easier to review.')]),
        ('Demo · Summit Infrastructure', 'Infrastructure', 'Ahmedabad', 'Arjun Mehta', 'Operations Director', 'Operations',
         [('Neutral', 'Suggestion', 'Visibility', 'A shared view of open operational issues would help our weekly reviews.'),
          ('Concerned', 'Concern', 'Service delivery', 'Two service requests missed the agreed turnaround time.'),
          ('Critical', 'Concern', 'Turnaround time', 'Repeated service delays require an escalation and a recovery plan.')]),
        ('Demo · Blue River Energy', 'Renewable energy', 'Pune', 'Sara Thomas', 'Head of Technology', 'Technology',
         [('Positive', 'Appreciation', 'Automation', 'The automated reconciliation has reduced manual work.'),
          ('Positive', 'New requirement', 'Automation', 'We would like to extend the automation to a second business unit.'),
          ('Positive', 'Appreciation', 'Data accuracy', 'The pilot results matched our source-system figures.')]),
        ('Demo · Cedar Manufacturing', 'Manufacturing', 'Vadodara', 'Dev Shah', 'Supply Chain Head', 'Supply Chain',
         [('Concerned', 'Concern', 'Data accuracy', 'Supplier master duplicates are causing purchase order rework.'),
          ('Neutral', 'Suggestion', 'Process improvement', 'Introduce validation before new supplier records are approved.'),
          ('Concerned', 'Concern', 'Visibility', 'Please provide a weekly report of unresolved supplier exceptions.')]),
        ('Demo · Meadow Services', 'Business services', 'Bengaluru', 'Nisha Rao', 'People Director', 'HR',
         [('Positive', 'Appreciation', 'Service delivery', 'The onboarding team has been responsive and helpful.'),
          ('Neutral', 'New requirement', 'Visibility', 'We need a consolidated onboarding progress dashboard.'),
          ('Positive', 'Appreciation', 'Process improvement', 'The new onboarding checklist is helping managers prepare.')]),
    ]
    action_examples = [
        (0, 'Publish a shared month-end reporting calendar', 'closed', -2, 'Medium'),
        (1, 'Share the service recovery plan and escalation owners', 'open', -3, 'Critical'),
        (1, 'Introduce weekly service-level checks', 'in progress', 4, 'High'),
        (2, 'Confirm scope for the second automation pilot', 'open', 8, 'Medium'),
        (3, 'Validate and merge duplicate supplier master records', 'in progress', -1, 'High'),
        (4, 'Review the onboarding dashboard with the customer', 'awaiting', 3, 'Low'),
    ]
    inserted = {'customers': 0, 'meetings': 0, 'actions': 0, 'audit events': 0}
    with connection() as c:
        if owner_id:
            owner = c.execute('SELECT id,name FROM users WHERE id=%s', (str(UUID(owner_id)),)).fetchone()
            if not owner:
                raise SystemExit('The requested app account does not exist.')
        else:
            users = c.execute('SELECT id,name FROM users ORDER BY id').fetchall()
            if len(users) != 1:
                raise SystemExit('Specify --owner-id for the account that should own the demo records.')
            owner = users[0]
        uid, name = str(owner['id']), owner['name']
        c.execute("SELECT set_config('app.user_id',%s,true)", (uid,))
        for i, (company, unit, location, contact, designation, function, reviews) in enumerate(accounts):
            cid = record_id(uid, f'customer-{i}')
            stakeholder = {'name': contact, 'role': designation, 'function': function,
                           'location': location, 'criticality': 'High' if i in (1, 3) else 'Medium'}
            metadata = {'seed': TAG, 'owner': name, 'location': location,
                        'criticality': 'Strategic' if i == 1 else 'High', 'stakeholders': [stakeholder]}
            result = c.execute('INSERT INTO customers(id,owner_id,name,business_unit,stakeholders,ui) '
                               'VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING',
                               (cid, uid, company, unit, contact, Jsonb(metadata)))
            inserted['customers'] += result.rowcount
            for j, (sentiment, category, theme, feedback) in enumerate(reviews):
                mid = record_id(uid, f'meeting-{i}-{j}')
                day = today - timedelta(days=(2-j)*7+i)
                summary = f'[DEMO] {category} from the customer: {feedback}'
                extra = {'seed': TAG, 'type': 'Governance review' if j == 2 else 'Service review',
                         'participants': f'{name}, {contact}', 'leader': name, 'status': 'Submitted',
                         'category': category, 'theme': theme, 'function': function, 'visibility': 'Private',
                         'feedback': feedback, 'feedbackEntries': [{'category': category, 'theme': theme, 'text': feedback}]}
                result = c.execute('INSERT INTO meetings(id,owner_id,customer_id,meeting_date,summary,sentiment,concerns,appreciation,ui) '
                                   'VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING',
                                   (mid, uid, cid, day, summary, sentiment.lower(),
                                    feedback if category == 'Concern' else '', feedback if category == 'Appreciation' else '', Jsonb(extra)))
                inserted['meetings'] += result.rowcount
            result = c.execute('INSERT INTO workspace_events(id,owner_id,customer_id,event,note,created_on) '
                               'VALUES(%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING',
                               (record_id(uid, f'event-{i}'), uid, cid, 'Demo records added',
                                'Fictional customer and three reviews added for testing.', today))
            inserted['audit events'] += result.rowcount
        for i, (index, description, status, offset, priority) in enumerate(action_examples):
            awaiting = status == 'awaiting'
            closure = 'Demo outcome: delivered and accepted by the customer.' if status == 'closed' else 'Demo outcome: dashboard delivered; awaiting customer review.' if awaiting else ''
            extra = {'seed': TAG, 'owner': name, 'priority': priority, 'function': accounts[index][5],
                     'meeting': record_id(uid, f'meeting-{index}-2'), 'status': 'Awaiting confirmation' if awaiting else status.capitalize(),
                     'confirmation': status == 'closed', 'closure': closure,
                     'updates': [{'date': today.isoformat(), 'text': '[DEMO] Initial progress update for testing.'}]}
            result = c.execute('INSERT INTO actions(id,owner_id,customer_id,description,due_date,status,closure_remarks,ui) '
                               'VALUES(%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT(id) DO NOTHING',
                               (record_id(uid, f'action-{i}'), uid, record_id(uid, f'customer-{index}'),
                                '[DEMO] '+description, today+timedelta(days=offset),
                                'in progress' if awaiting else status, closure, Jsonb(extra)))
            inserted['actions'] += result.rowcount
        counts = {table: c.execute(f"SELECT count(*) AS count FROM {table} WHERE ui->>'seed'=%s", (TAG,)).fetchone()['count']
                  for table in ('customers', 'meetings', 'actions')}
    print(f'Demo data ready for {name}.')
    print('Newly inserted:', inserted)
    print('Demo totals:', counts)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--owner-id', help='Existing app account UUID; required if multiple accounts exist')
    seed(parser.parse_args().owner_id)
