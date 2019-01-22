import React from 'react';

// ---------------------- APP STATE MANAGEMENT / REDUX ----------------------
import { createStore, applyMiddleware, combineReducers } from 'redux';
import { Provider as ReduxProvider } from 'react-redux';
import { connect } from 'react-redux';
import createSagaMiddleware, { SagaIterator } from 'redux-saga';
import { fork, all } from 'redux-saga/effects';
import debounce from 'lodash/debounce';

// ---------------------- FORM HANDLING ----------------------
import { Formik, FormikProps, Form, Field, FieldProps, FormikActions } from 'formik';

import {
	TaskReducer,
	TasksSaga,
	TaskId,
	Task,
	mapTaskDispatchToProps,
	ExecutableTaskActions,
	TasksState,
	mapTaskStateToProps,
	TaskData
} from './state/task';

// ---------------------- CSS IN JS / EMOTION ----------------------
import styled from '@emotion/styled';

import './normalize.css';

interface Properties {}

interface AppState {}

const styles = {
	color: 'firebrick',
	backgroundColor: 'lavender'
};

const Container = styled.div(styles);

interface TaskListProperties {
	parent_task_id?: TaskId;
	task_list?: Task[];
}

const TaskOList = styled.ol({
	padding: 0,
	margin: 0
});

const TaskListItem = styled.li({
	padding: 0,
	margin: 0
});

const TaskNameDone = styled.strong({
	textDecoration: 'line-through'
});

const StyledLabel = styled.label({
	display: 'block'
});

interface FieldLabelProps {
	htmlFor?: string;
	label: string;
}
const FieldLabel: React.StatelessComponent<FieldLabelProps> = props => {
	return <StyledLabel htmlFor={props.htmlFor}>{props.label}</StyledLabel>;
};

interface TextFieldProps {
	name: string;
	label?: string;
	placeholder?: string;
	required?: boolean;
}

const TextField: React.StatelessComponent<TextFieldProps> = props => {
	return (
		<Field
			name={props.name}
			render={({ field }: FieldProps<TextFieldProps>) => (
				<div className="textfield">
					{props.label && <FieldLabel htmlFor={props.name} label={props.label} />}
					<input
						type="text"
						placeholder={props.placeholder}
						id={props.name}
						required={props.required}
						{...field}
					/>
				</div>
			)}
		/>
	);
};

const TextAreaField: React.StatelessComponent<TextFieldProps> = props => {
	return (
		<Field
			name={props.name}
			render={({ field }: FieldProps<TextFieldProps>) => (
				<div className="textfield">
					{props.label && <FieldLabel htmlFor={props.name} label={props.label} />}
					<textarea placeholder={props.placeholder} id={props.name} required={props.required} {...field} />
				</div>
			)}
		/>
	);
};

interface TaskDialogProperties {
	addTask: ExecutableTaskActions['addTask'];
}
class TaskDialog extends React.PureComponent<TaskDialogProperties> {
	constructor(props: TaskDialogProperties) {
		super(props);
	}

	public render() {
		return (
			<Formik
				initialValues={{ name: '', description: '', state: 'open' }}
				onSubmit={(values: TaskData, formikBag: FormikActions<TaskData>) => {
					this.props.addTask({ ...values });
					formikBag.resetForm();
				}}
				render={(formikBag: FormikProps<{}>) => (
					<Form method="get">
						<fieldset>
							<legend>Task Data</legend>
							<TextField name="name" label="Name" required={true} />
							<TextAreaField name="description" label="Description" />
							<button type="submit">Add new task</button>
						</fieldset>
					</Form>
				)}
			/>
		);
	}
}

const TaskList: React.StatelessComponent<TaskListProperties & ExecutableTaskActions> = (
	props: TaskListProperties & ExecutableTaskActions
) => {
	const complete_task_list = props.task_list || [];

	const task_list = complete_task_list.filter((task: Task) => {
		if (props.parent_task_id) {
			return (
				task.parents &&
				task.parents.find(
					task_id => typeof props.parent_task_id !== 'undefined' && task_id === props.parent_task_id
				)
			);
		} else {
			return typeof task.parents === 'undefined' || task.parents.length === 0;
		}
	});

	const { parent_task_id, ...remaining } = props;
	return (
		<React.Fragment>
			{props.parent_task_id ? null : <TaskDialog addTask={props.addTask} />}

			{task_list.length === 0 && !props.parent_task_id ? (
				<div>No open tasks found</div>
			) : (
				<TaskOList>
					{task_list.map((task: Task, index: number) => {
						return (
							<TaskListItem key={task.id}>
								<input
									type="checkbox"
									checked={task.state === 'finished'}
									onChange={() =>
										props.changeTaskState(task.id, task.state === 'finished' ? 'open' : 'finished')
									}
								/>
								{task.state === 'finished' ? (
									<TaskNameDone>{task.name}</TaskNameDone>
								) : (
									<strong>{task.name}</strong>
								)}
								{task.is_syncing && <span>*</span>}
								{task.description && <small>{task.description}</small>}
								<button
									type="button"
									onClick={() => {
										props.removeTask(task.id);
									}}
								>
									Delete
								</button>
								<TaskList parent_task_id={task.id} {...remaining} />
							</TaskListItem>
						);
					})}
				</TaskOList>
			)}
		</React.Fragment>
	);
};

const TaskListWithState = connect(
	mapTaskStateToProps,
	mapTaskDispatchToProps
)(TaskList);

function* rootSaga(): SagaIterator {
	yield all([fork(TasksSaga)]);
}

const rootReducer = combineReducers({
	tasks: TaskReducer
});

export interface OpusState {
	tasks: TasksState;
}

// try/catch because this might fail if the browser does not allow cookies
let initial_state = {};
let allows_session_storage = false;
try {
	const session_storage_value = sessionStorage.getItem('opus_store');
	allows_session_storage = true;
	if (session_storage_value !== null) {
		initial_state = JSON.parse(session_storage_value);
	}
} catch (e) {
	console.error(e);
}

const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, initial_state, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);

// try to persist the store within the browser storage
if (allows_session_storage) {
	store.subscribe(
		debounce(() => {
			sessionStorage.setItem('opus_store', JSON.stringify(store.getState()));
			// tslint:disable-next-line:align
		}, 2500)
	);
}

export class Opus extends React.PureComponent<Properties, AppState> {
	public render() {
		return (
			<ReduxProvider store={store}>
				<Container>
					<header>
						<h1>List of all your tasks</h1>
					</header>
					<TaskListWithState />
				</Container>
			</ReduxProvider>
		);
	}
}
