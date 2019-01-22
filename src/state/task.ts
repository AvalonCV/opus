import { Dispatch } from 'redux';
import { createAction, getType, ActionType } from 'typesafe-actions';
import { SagaIterator, delay } from 'redux-saga';
import { put, takeEvery, call } from 'redux-saga/effects';

//
import { Ticket } from './ticket';
import { User } from './user';
import { OpusState } from '../Opus';

export const tasks_actions = {
	add: createAction('ADD_TASK', resolve => {
		return (data: TaskData & OptionalTaskId) => resolve(data);
	}),
	add_fail: createAction('ADD_TASK_FAILURE'),
	add_pending: createAction('ADD_TASK_PENDING', resolve => {
		return (id: TaskId) => resolve({ id });
	}),
	add_success: createAction('ADD_TASK_SUCCESS', resolve => {
		return (id: TaskId) => resolve({ id });
	}),

	change_state: createAction('CHANGE_TASK_STATE', resolve => {
		return (id: TaskId, state: TaskState) => resolve({ id, state });
	}),

	remove: createAction('REMOVE_TASK', resolve => {
		return (id: TaskId) => resolve({ id });
	})
};
type TaskAction = ActionType<typeof tasks_actions>;

export type TaskId = number;
export type TaskState = 'open' | 'waiting' | 'work_in_progress' | 'finished' | 'cancelled';

interface OptionalTaskId {
	id?: TaskId;
}

interface TaskInternals {
	id: TaskId;
	creation_datetime: Date;
	has_been_synced: boolean;
	is_syncing: boolean;
}

export interface TaskData {
	name: string;
	description?: string;
	state: TaskState;
	ticket_reference?: Ticket;
	deadline?: Date;
	parents?: TaskId[];
	children?: TaskId[];
	employer?: User[];
	worker?: User[];
}

export type Task = TaskInternals & TaskData;

export interface TasksState {
	task_list: Task[];
}

export interface ExecutableTaskActions {
	removeTask: (id: TaskId) => void;
	changeTaskState: (id: TaskId, state: TaskState) => void;
	addTask: (data: TaskData) => void;
}

export function mapTaskDispatchToProps(dispatch: Dispatch<TaskAction>): ExecutableTaskActions {
	return {
		removeTask: (id: TaskId) => {
			dispatch({ type: getType(tasks_actions.remove), payload: { id } });
		},
		changeTaskState: (id: TaskId, state: TaskState) => {
			dispatch({ type: getType(tasks_actions.change_state), payload: { id, state } });
		},
		addTask: (data: TaskData) => {
			dispatch({ type: getType(tasks_actions.add), payload: data });
		}
	};
}

export function mapTaskStateToProps(state: OpusState): TasksState {
	return state.tasks;
}

function modifyTaskDataInList(task_list: Task[], task_id: TaskId, task_data: Partial<Task>): Task[] {
	return task_list.map((task: Task) => {
		if (task.id === task_id) {
			return {
				...task,
				...task_data
			};
		} else {
			return task;
		}
	});
}

export function TaskReducer(state: TasksState | undefined, action: TaskAction): TasksState {
	if (typeof state === 'undefined') {
		return { task_list: [] };
	} else {
		switch (action.type) {
			case getType(tasks_actions.add):
				// store new id in payload for additional SYNC-Actions
				const task_id = Date.now();
				action.payload.id = task_id;
				return {
					...state,
					task_list: [
						...state.task_list,
						/* is there any way to do that in a more dynamic way (that does
						 	not keep every variable within the payload and just adds
						 	the TaskData values?) */
						{
							id: task_id,
							creation_datetime: new Date(),
							has_been_synced: false,
							is_syncing: false,
							name: action.payload.name,
							description: action.payload.description || '',
							state: action.payload.state
						}
					]
				};

			case getType(tasks_actions.add_pending):
				return {
					...state,
					task_list: modifyTaskDataInList(state.task_list, action.payload.id, { is_syncing: true })
				};
			case getType(tasks_actions.add_success):
				return {
					...state,
					task_list: modifyTaskDataInList(state.task_list, action.payload.id, {
						is_syncing: false,
						has_been_synced: true
					})
				};

			case getType(tasks_actions.change_state):
				return {
					...state,
					task_list: modifyTaskDataInList(state.task_list, action.payload.id, {
						state: action.payload.state
					})
				};

			case getType(tasks_actions.remove):
				return {
					...state,
					task_list: state.task_list.filter((task: Task) => {
						return task.id !== action.payload.id;
					})
				};

			default:
				return state;
		}
	}
}

// tslint:disable-next-line:no-any
function* handleAddTask(action: TaskAction): SagaIterator {
	if (action.type === getType(tasks_actions.add) && action.payload.id) {
		yield put({ type: getType(tasks_actions.add_pending), payload: { id: action.payload.id } });
		yield call(delay, 1000);
		// do something
		yield put({ type: getType(tasks_actions.add_success), payload: { id: action.payload.id } });
	}
}

export function* TasksSaga(): SagaIterator {
	yield takeEvery(getType(tasks_actions.add), handleAddTask);
}
